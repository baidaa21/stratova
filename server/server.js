'use strict';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const D = require('./db');
const { db } = D;

const PORT = +process.env.PORT || 3000;
const PROD = process.env.NODE_ENV === 'production';
const ROOT = path.join(__dirname, '..');
const COOKIE = 'stratova_token';

/* JWT secret: env var, else generated once and kept in the data dir */
function secret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const f = path.join(D.DATA_DIR, '.jwt_secret');
  try { return fs.readFileSync(f, 'utf8'); } catch (_) { }
  const s = crypto.randomBytes(48).toString('hex'); fs.writeFileSync(f, s, { mode: 0o600 }); return s;
}
const SECRET = secret();
const defaultsInUse = D.bootstrap();

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '15mb' }));

const ip = req => req.ip || '';
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(x => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));

/* CSRF-lite: state-changing requests must come from our own origin */
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  const o = req.headers.origin;
  if (o && new URL(o).host !== req.headers.host) return res.status(403).json({ error: 'Cross-origin request blocked' });
  next();
});

/* ---------- auth ---------- */
function issue(res, u) {
  const token = jwt.sign({ ws: u.workspace, role: u.role, tv: u.tv }, SECRET, { expiresIn: '12h' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true', maxAge: 12 * 3600 * 1000, path: '/' });
}
function auth(req, res, next) {
  try {
    const p = jwt.verify(cookies(req)[COOKIE] || '', SECRET);
    const u = db.prepare('SELECT * FROM users WHERE workspace=?').get(p.ws);
    if (!u || u.tv !== p.tv) throw 0;
    req.user = u; next();
  } catch (_) { res.status(401).json({ error: 'Not signed in' }); }
}
const adminOnly = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Owner access required' });
const canBrand = (u, id) => D.BRAND_IDS.includes(id) && (u.role === 'admin' || u.workspace === id);

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } });

app.get('/api/health', (_q, r) => r.json({ ok: true, time: new Date().toISOString() }));

app.post('/api/login', loginLimiter, (req, res) => {
  const { workspace, username, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE workspace=?').get(String(workspace || ''));
  const ok = u && String(username || '').trim().toLowerCase() === u.username.toLowerCase() && bcrypt.compareSync(String(password || ''), u.pass_hash);
  if (!ok) { D.audit(workspace, 'login_failed', String(username || '').slice(0, 40), ip(req)); return res.status(401).json({ error: 'Incorrect username or password.' }); }
  D.audit(u.workspace, 'login', '', ip(req));
  issue(res, u);
  res.json({ workspace: u.workspace, role: u.role, theme: u.theme });
});
app.post('/api/logout', (req, res) => { res.clearCookie(COOKIE, { path: '/' }); res.json({ ok: true }); });
app.get('/api/me', auth, (req, res) => res.json({ workspace: req.user.workspace, role: req.user.role, theme: req.user.theme, username: req.user.username }));

/* ---------- state (what the web app loads / saves) ---------- */
function fullState(u) {
  const st = { role: u.role, workspace: u.workspace, theme: u.theme, brands: {}, revs: {} };
  D.BRAND_IDS.filter(id => canBrand(u, id)).forEach(id => { const b = D.loadBrand(id); st.revs[id] = b.rev; delete b.rev; st.brands[id] = b; });
  if (u.role === 'admin') st.admin = { user: u.username };
  return st;
}
app.get('/api/state', auth, (req, res) => res.json(fullState(req.user)));

function setCreds(ws, username, password) {
  if (username != null) {
    const n = String(username).trim().slice(0, 40);
    if (!n) throw Object.assign(new Error('Username is required'), { status: 400 });
    db.prepare('UPDATE users SET username=? WHERE workspace=?').run(n, ws);
  }
  if (password) {
    if (String(password).length < 6) throw Object.assign(new Error('Password must be at least 6 characters'), { status: 400 });
    db.prepare('UPDATE users SET pass_hash=?, tv=tv+1 WHERE workspace=?').run(bcrypt.hashSync(String(password), 10), ws);
  }
}

app.put('/api/state', auth, (req, res) => {
  const body = req.body || {}, u = req.user, revs = {};
  try {
    for (const [id, o] of Object.entries(body.brands || {})) {
      if (!canBrand(u, id)) return res.status(403).json({ error: 'Not allowed for ' + id });
      if (o.user != null || o.pass) setCreds(id, o.user, o.pass);
      revs[id] = D.replaceBrand(id, o, { expectedRev: body.revs && body.revs[id] });
      D.audit(u.workspace, 'save', `${id}: ${(o.sales || []).length} sales`, ip(req));
    }
    if (u.role === 'admin' && body.admin) { setCreds('admin', body.admin.user, body.admin.pass); D.audit(u.workspace, 'admin_credentials', '', ip(req)); }
    if (body.theme === 'dark' || body.theme === 'light') db.prepare('UPDATE users SET theme=? WHERE workspace=?').run(body.theme, u.workspace);
    // password change invalidates old tokens: re-issue for the current user
    const fresh = db.prepare('SELECT * FROM users WHERE workspace=?').get(u.workspace); issue(res, fresh);
    res.json({ ok: true, revs });
  } catch (e) {
    if (e instanceof D.Conflict) return res.status(409).json({ error: 'Data was changed on another device', conflict: e.message });
    console.error(e); res.status(e.status || 500).json({ error: e.status ? e.message : 'Server error' });
  }
});

/* ---------- read APIs (server-side analytics) ---------- */
const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
const calc = s => {
  const sub = sum(s.items, i => i.price), net = Math.max(0, sub - (s.discount || 0)), tot = net + net * (s.taxPct || 0) / 100;
  const paid = sum(s.payments, p => p.amount), cost = sum(s.items, i => i.prod + i.lab);
  return { total: tot, paid, balance: Math.round((tot - paid) * 100) / 100, profit: net - cost };
};
const brandGuard = (req, res, next) => canBrand(req.user, req.params.id) ? next() : res.status(403).json({ error: 'Not allowed' });

app.get('/api/brands/:id/summary', auth, brandGuard, (req, res) => {
  const { from = '0000-00-00', to = '9999-99-99' } = req.query;
  const b = D.loadBrand(req.params.id);
  const sales = b.sales.filter(s => s.date >= from && s.date <= to).map(s => ({ s, c: calc(s) }));
  const exp = b.expenses.filter(e => e.date >= from && e.date <= to);
  const revenue = sum(sales, x => x.c.total), cost = sum(sales, x => sum(x.s.items, i => i.prod + i.lab)), expenses = sum(exp, e => +e.amount || 0);
  const byDay = {}; sales.forEach(x => { byDay[x.s.date] = (byDay[x.s.date] || 0) + x.c.total; });
  res.json({
    from, to, bills: sales.length, revenue, collected: sum(sales, x => x.c.paid), outstanding: sum(sales, x => Math.max(0, x.c.balance)),
    privateCost: cost, expenses, netProfit: revenue - cost - expenses, revenueByDay: byDay
  });
});
app.get('/api/brands/:id/sales', auth, brandGuard, (req, res) => {
  const q = String(req.query.q || '').toLowerCase().replace(/\s/g, '');
  const b = D.loadBrand(req.params.id);
  let list = b.sales.filter(s => (!req.query.from || s.date >= req.query.from) && (!req.query.to || s.date <= req.query.to));
  if (q) list = list.filter(s => (D.plateOf(s.car) + (s.name + s.phone + s.model).toLowerCase().replace(/\s/g, '')).toLowerCase().includes(q));
  res.json(list.reverse().slice(0, Math.min(500, +req.query.limit || 100)).map(s => ({ ...s, ...calc(s) })));
});
app.get('/api/brands/:id/cars/:plate', auth, brandGuard, (req, res) => {
  const p = D.plateOf(req.params.plate);
  const sales = D.loadBrand(req.params.id).sales.filter(s => D.plateOf(s.car) === p);
  res.json({ plate: p, visits: sales.length, spent: sum(sales, s => calc(s).total), sales: sales.reverse() });
});

/* ---------- owner-only ---------- */
app.get('/api/admin/backup', auth, adminOnly, (req, res) => {
  const st = fullState(req.user); D.audit('admin', 'backup_download', '', ip(req));
  res.setHeader('Content-Disposition', `attachment; filename="stratova-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({ brands: st.brands, exported: new Date().toISOString() });
});
app.get('/api/admin/audit', auth, adminOnly, (req, res) => res.json(db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 200').all()));
app.post('/api/admin/wipe', auth, adminOnly, (req, res) => {
  D.BRAND_IDS.forEach(id => {
    const blank = { profile: D.loadBrand(id).profile, counter: 1, log: [], services: D.SEED[id].map((x, i) => ({ id: 'sv' + i, name: x[0], price: x[1], prod: x[2], lab: x[3] })) };
    D.replaceBrand(id, blank);
  });
  D.audit('admin', 'wipe_all', '', ip(req)); res.json({ ok: true, state: fullState(req.user) });
});

app.use('/api', (_q, res) => res.status(404).json({ error: 'Not found' }));

/* ---------- static front-end (explicit allow-list; server/ and data/ never exposed) ---------- */
['index.html', 'style.css', 'core.js', 'brand.js', 'admin.js', 'api.js'].forEach(f => app.get(f === 'index.html' ? ['/', '/index.html'] : '/' + f, (_q, r) => r.sendFile(path.join(ROOT, f))));
app.use('/assets', express.static(path.join(ROOT, 'assets'), { maxAge: '7d' }));

/* ---------- nightly backup ---------- */
const BK = path.join(D.DATA_DIR, 'backups');
const runBackup = () => { try { D.backupFile(BK); } catch (e) { console.error('backup failed', e.message); } };
runBackup(); setInterval(runBackup, 24 * 3600 * 1000).unref();

module.exports = app;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Stratova running on http://localhost:${PORT}`);
    if (defaultsInUse) console.warn('WARNING: default passwords are active. Change them in Owner Console > Access & Data, or set ADMIN_PASSWORD / DETAILING_PASSWORD / AUTOSTUDIO_PASSWORD before first start.');
    if (PROD && !process.env.COOKIE_SECURE) console.warn('NOTE: set COOKIE_SECURE=true when serving over HTTPS.');
  });
}
