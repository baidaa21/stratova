'use strict';
/* SQLite layer (node:sqlite, no native build needed). */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'stratova.db');
const db = new DatabaseSync(DB_FILE);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users(
  workspace TEXT PRIMARY KEY,           -- detailing | autostudio | admin
  username  TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  role      TEXT NOT NULL,              -- brand | admin
  theme     TEXT NOT NULL DEFAULT 'dark',
  tv        INTEGER NOT NULL DEFAULT 1, -- token version (bump to invalidate sessions)
  created   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS brands(
  id TEXT PRIMARY KEY,
  profile_json TEXT NOT NULL DEFAULT '{}',
  counter INTEGER NOT NULL DEFAULT 1,
  log_json TEXT NOT NULL DEFAULT '[]',
  rev INTEGER NOT NULL DEFAULT 1,
  updated TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS services(
  brand TEXT NOT NULL, id TEXT NOT NULL, ord INTEGER NOT NULL,
  name TEXT, price REAL, prod REAL, lab REAL,
  PRIMARY KEY(brand,id)
);
CREATE TABLE IF NOT EXISTS sales(
  brand TEXT NOT NULL, id TEXT NOT NULL, ord INTEGER NOT NULL,
  no INTEGER, date TEXT, car TEXT, plate TEXT, name TEXT, phone TEXT, model TEXT,
  discount REAL DEFAULT 0, tax_pct REAL DEFAULT 0, note TEXT, status TEXT, staff TEXT,
  created TEXT, demo INTEGER DEFAULT 0,
  PRIMARY KEY(brand,id)
);
CREATE INDEX IF NOT EXISTS ix_sales_date  ON sales(brand,date);
CREATE INDEX IF NOT EXISTS ix_sales_plate ON sales(brand,plate);
CREATE TABLE IF NOT EXISTS sale_items(
  brand TEXT NOT NULL, sale_id TEXT NOT NULL, ord INTEGER NOT NULL,
  descr TEXT, price REAL, prod REAL, lab REAL    -- prod/lab are PRIVATE costs
);
CREATE INDEX IF NOT EXISTS ix_items ON sale_items(brand,sale_id);
CREATE TABLE IF NOT EXISTS payments(
  brand TEXT NOT NULL, sale_id TEXT NOT NULL, ord INTEGER NOT NULL,
  date TEXT, amount REAL, method TEXT, note TEXT
);
CREATE INDEX IF NOT EXISTS ix_pay ON payments(brand,sale_id);
CREATE TABLE IF NOT EXISTS records(           -- expenses | bookings | staff | products
  brand TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, ord INTEGER NOT NULL,
  date TEXT, data TEXT NOT NULL,
  PRIMARY KEY(brand,kind,id)
);
CREATE TABLE IF NOT EXISTS audit(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  t TEXT NOT NULL DEFAULT (datetime('now')),
  workspace TEXT, action TEXT, detail TEXT, ip TEXT
);
`);

const BRAND_IDS = ['detailing', 'autostudio'];
const SEED = {
  detailing: [['Exterior Wash', 0, 0, 0], ['Interior Detailing', 0, 0, 0], ['Ceramic Coating', 0, 0, 0], ['Paint Protection Film', 0, 0, 0], ['Polish & Wax', 0, 0, 0]],
  autostudio: [['Engine Wash', 0, 0, 0], ['Denting & Painting', 0, 0, 0], ['AC Service', 0, 0, 0], ['Oil Change', 0, 0, 0], ['Car Wrapping', 0, 0, 0]]
};

/* ---------- bootstrap ---------- */
function bootstrap() {
  const has = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (has) return false;
  const pw = (k, d) => process.env[k] || d;
  const rows = [
    ['detailing', 'detailing', pw('DETAILING_PASSWORD', 'aura123'), 'brand'],
    ['autostudio', 'autostudio', pw('AUTOSTUDIO_PASSWORD', 'aura123'), 'brand'],
    ['admin', pw('ADMIN_USER', 'admin'), pw('ADMIN_PASSWORD', 'admin123'), 'admin']
  ];
  const ins = db.prepare('INSERT INTO users(workspace,username,pass_hash,role) VALUES(?,?,?,?)');
  rows.forEach(r => ins.run(r[0], r[1], bcrypt.hashSync(r[2], 10), r[3]));
  BRAND_IDS.forEach(id => {
    db.prepare('INSERT OR IGNORE INTO brands(id,profile_json) VALUES(?,?)').run(id, JSON.stringify({
      phone: '', address: '', footer: 'Thank you for choosing us. We value your trust!', tax: 0, paper: 'A4'
    }));
    SEED[id].forEach((x, i) => db.prepare('INSERT INTO services VALUES(?,?,?,?,?,?,?)').run(id, 'sv' + i, i, x[0], x[1], x[2], x[3]));
  });
  return !process.env.ADMIN_PASSWORD; // true => default passwords in use
}

/* ---------- sanitizers ---------- */
const str = (v, n = 300) => (v == null ? '' : String(v)).slice(0, n);
const nn = v => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
const plateOf = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/* ---------- read ---------- */
function loadBrand(id) {
  const b = db.prepare('SELECT * FROM brands WHERE id=?').get(id);
  if (!b) return null;
  const u = db.prepare('SELECT username FROM users WHERE workspace=?').get(id);
  const items = {}, pays = {};
  db.prepare('SELECT * FROM sale_items WHERE brand=? ORDER BY sale_id,ord').all(id)
    .forEach(r => (items[r.sale_id] = items[r.sale_id] || []).push({ desc: r.descr, price: r.price, prod: r.prod, lab: r.lab }));
  db.prepare('SELECT * FROM payments WHERE brand=? ORDER BY sale_id,ord').all(id)
    .forEach(r => (pays[r.sale_id] = pays[r.sale_id] || []).push({ date: r.date, amount: r.amount, method: r.method, note: r.note }));
  const sales = db.prepare('SELECT * FROM sales WHERE brand=? ORDER BY ord').all(id).map(r => {
    const s = {
      id: r.id, no: r.no, date: r.date, car: r.car, name: r.name, phone: r.phone, model: r.model,
      items: items[r.id] || [], discount: r.discount, taxPct: r.tax_pct, note: r.note, status: r.status,
      staff: r.staff, payments: pays[r.id] || [], created: r.created
    };
    if (r.demo) s.demo = true;
    return s;
  });
  const rec = kind => db.prepare('SELECT data FROM records WHERE brand=? AND kind=? ORDER BY ord').all(id, kind).map(r => JSON.parse(r.data));
  return {
    user: u ? u.username : id,
    profile: JSON.parse(b.profile_json), counter: b.counter, log: JSON.parse(b.log_json), rev: b.rev,
    services: db.prepare('SELECT id,name,price,prod,lab FROM services WHERE brand=? ORDER BY ord').all(id),
    sales, expenses: rec('expenses'), bookings: rec('bookings'), staff: rec('staff'), products: rec('products')
  };
}

/* ---------- write (transactional full replace of one brand) ---------- */
class Conflict extends Error { }
function replaceBrand(id, o, { expectedRev } = {}) {
  const cur = db.prepare('SELECT rev FROM brands WHERE id=?').get(id);
  if (!cur) throw new Error('Unknown brand');
  if (expectedRev != null && Number(expectedRev) !== cur.rev) throw new Conflict(id);
  const arr = v => (Array.isArray(v) ? v : []);
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const t of ['services', 'sales', 'sale_items', 'payments', 'records']) db.prepare(`DELETE FROM ${t} WHERE brand=?`).run(id);
    const iSv = db.prepare('INSERT INTO services VALUES(?,?,?,?,?,?,?)');
    arr(o.services).forEach((x, i) => iSv.run(id, str(x.id, 60) || 'sv' + i, i, str(x.name, 120), nn(x.price), nn(x.prod), nn(x.lab)));
    const iS = db.prepare('INSERT OR REPLACE INTO sales VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    const iI = db.prepare('INSERT INTO sale_items VALUES(?,?,?,?,?,?,?)');
    const iP = db.prepare('INSERT INTO payments VALUES(?,?,?,?,?,?,?)');
    arr(o.sales).forEach((s, i) => {
      const sid = str(s.id, 60); if (!sid) return;
      iS.run(id, sid, i, Math.trunc(nn(s.no)), str(s.date, 10), str(s.car, 40), plateOf(s.car), str(s.name, 120), str(s.phone, 40),
        str(s.model, 120), nn(s.discount), nn(s.taxPct), str(s.note, 1000), str(s.status, 20) || 'Delivered', str(s.staff, 120), str(s.created, 40), s.demo ? 1 : 0);
      arr(s.items).forEach((x, k) => iI.run(id, sid, k, str(x.desc, 200), nn(x.price), nn(x.prod), nn(x.lab)));
      arr(s.payments).forEach((p, k) => iP.run(id, sid, k, str(p.date, 10), nn(p.amount), str(p.method, 30), str(p.note, 300)));
    });
    const iR = db.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?,?,?,?)');
    for (const kind of ['expenses', 'bookings', 'staff', 'products'])
      arr(o[kind]).forEach((x, i) => { if (x && x.id) iR.run(id, kind, str(x.id, 60), i, str(x.date, 10), JSON.stringify(x)); });
    db.prepare('UPDATE brands SET profile_json=?,counter=?,log_json=?,rev=rev+1,updated=datetime(\'now\') WHERE id=?')
      .run(JSON.stringify(o.profile || {}), Math.max(1, Math.trunc(nn(o.counter)) || 1), JSON.stringify(arr(o.log).slice(-300)), id);
    db.exec('COMMIT');
  } catch (e) { try { db.exec('ROLLBACK'); } catch (_) { } throw e; }
  return db.prepare('SELECT rev FROM brands WHERE id=?').get(id).rev;
}

function audit(workspace, action, detail, ip) {
  try { db.prepare('INSERT INTO audit(workspace,action,detail,ip) VALUES(?,?,?,?)').run(workspace || '', action, str(detail, 500), str(ip, 60)); } catch (_) { }
}

function backupFile(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, 'stratova-' + new Date().toISOString().slice(0, 10) + '.db');
  try { fs.unlinkSync(f); } catch (_) { }
  db.exec(`VACUUM INTO '${f.replace(/'/g, "''")}'`);
  const all = fs.readdirSync(dir).filter(x => x.endsWith('.db')).sort();
  all.slice(0, Math.max(0, all.length - 14)).forEach(x => fs.unlinkSync(path.join(dir, x)));
  return f;
}

module.exports = { db, DATA_DIR, BRAND_IDS, SEED, bootstrap, loadBrand, replaceBrand, Conflict, audit, backupFile, plateOf };
