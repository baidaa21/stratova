'use strict';
/* End-to-end API test: runs against a throwaway database. */
const os = require('os'), fs = require('fs'), path = require('path'), assert = require('assert');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'stratova-'));
const app = require('./server');

(async () => {
  const srv = app.listen(0), base = 'http://127.0.0.1:' + srv.address().port;
  const jar = {};
  const call = async (who, method, url, body) => {
    const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', Cookie: jar[who] || '' }, body: body ? JSON.stringify(body) : undefined });
    const c = r.headers.get('set-cookie'); if (c) jar[who] = c.split(';')[0];
    let j = null; try { j = await r.json(); } catch (_) { }
    return { s: r.status, j };
  };
  let n = 0; const ok = (c, m) => { assert(c, m); n++; console.log('  ok -', m); };

  ok((await call('x', 'GET', '/api/state')).s === 401, 'state requires login');
  ok((await call('x', 'POST', '/api/login', { workspace: 'detailing', username: 'detailing', password: 'wrong' })).s === 401, 'wrong password rejected');
  const li = await call('det', 'POST', '/api/login', { workspace: 'detailing', username: 'detailing', password: 'aura123' });
  ok(li.s === 200 && li.j.role === 'brand', 'brand login works');
  await call('adm', 'POST', '/api/login', { workspace: 'admin', username: 'admin', password: 'admin123' });

  let st = (await call('det', 'GET', '/api/state')).j;
  ok(Object.keys(st.brands).join() === 'detailing', 'brand user only receives own brand');
  ok(!JSON.stringify(st).includes('pass'), 'no password data sent to client');

  const sale = { id: 's1', no: 1, date: '2026-11-20', car: 'LEB-123', name: 'Ali', phone: '0300', model: 'Civic', items: [{ desc: 'Ceramic', price: 50000, prod: 12000, lab: 6000 }], discount: 0, taxPct: 0, note: '', status: 'Ready', staff: '', payments: [{ date: '2026-11-20', amount: 20000, method: 'Cash', note: 'advance' }], created: 'x' };
  const b = { ...st.brands.detailing, sales: [sale], expenses: [{ id: 'e1', date: '2026-11-20', cat: 'Rent', note: '', amount: 5000 }], counter: 2 };
  let r = await call('det', 'PUT', '/api/state', { brands: { detailing: b }, revs: st.revs });
  ok(r.s === 200, 'brand can save its data');
  r = await call('det', 'PUT', '/api/state', { brands: { detailing: b }, revs: st.revs });
  ok(r.s === 409, 'stale revision is rejected (409)');
  r = await call('det', 'PUT', '/api/state', { brands: { autostudio: b }, revs: {} });
  ok(r.s === 403, 'brand cannot write another brand');

  st = (await call('det', 'GET', '/api/state')).j;
  ok(st.brands.detailing.sales[0].items[0].prod === 12000 && st.brands.detailing.sales[0].payments[0].amount === 20000, 'sale, private costs and advance round-trip');
  const sm = (await call('det', 'GET', '/api/brands/detailing/summary')).j;
  ok(sm.revenue === 50000 && sm.collected === 20000 && sm.outstanding === 30000 && sm.netProfit === 50000 - 18000 - 5000, 'server analytics correct');
  ok((await call('det', 'GET', '/api/brands/detailing/cars/leb123')).j.visits === 1, 'car history by plate');
  ok((await call('det', 'GET', '/api/brands/autostudio/summary')).s === 403, 'brand cannot read other brand');
  ok((await call('det', 'GET', '/api/admin/backup')).s === 403, 'brand cannot use owner endpoints');

  const all = (await call('adm', 'GET', '/api/state')).j;
  ok(Object.keys(all.brands).length === 2 && all.brands.detailing.sales.length === 1, 'owner sees all brands');
  ok((await call('adm', 'GET', '/api/admin/audit')).j.some(a => a.action === 'login'), 'audit log records logins');

  r = await call('det', 'PUT', '/api/state', { brands: { detailing: { ...st.brands.detailing, pass: 'newpass1' } }, revs: st.revs });
  ok(r.s === 200, 'password change accepted');
  ok((await call('y', 'POST', '/api/login', { workspace: 'detailing', username: 'detailing', password: 'newpass1' })).s === 200, 'new password works (hashed)');
  ok((await call('y', 'POST', '/api/login', { workspace: 'detailing', username: 'detailing', password: 'aura123' })).s === 401, 'old password no longer works');
  r = await call('adm', 'POST', '/api/admin/wipe');
  ok(r.s === 200 && r.j.state.brands.detailing.sales.length === 0, 'owner wipe works');

  console.log(`\nAll ${n} checks passed.`); srv.close(); process.exit(0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
