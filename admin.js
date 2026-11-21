/* Stratova Owner Console (admin) + demo data */
'use strict';

const RANGES = [['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['year', 'This year'], ['all', 'All time']];
function rangeOf(k) {
  const t = today();
  return k === 'today' ? [t, t] : k === 'week' ? [weekStart(t), t] : k === 'month' ? [monthStart(t), t] : k === 'year' ? [t.slice(0, 4) + '-01-01', t] : ['2000-01-01', t];
}
const prevRange = ([f, t]) => { const n = daysBetween(f, t), pt = addDays(f, -1); return [addDays(pt, -(n - 1)), pt]; };
const groupStats = (f, t) => BIDS.map(b => stats(DB.brands[b], f, t)).reduce(addStats);
const allBrandSales = () => BIDS.flatMap(b => DB.brands[b].sales.map(s => ({ s, b })));

/* ================= OVERVIEW ================= */
let aRange = 'month';
PAGES.a_overview = () => {
  const g14 = Array.from({ length: 14 }, (_, i) => { const x = addDays(today(), i - 13); return groupStats(x, x); }), sp = k => g14.map(s => s[k]);
  const [f, t] = rangeOf(aRange), G = groupStats(f, t), hasPrev = aRange !== 'all', P = hasPrev ? groupStats(...prevRange([f, t])) : null;
  const per = BIDS.map(b => ({ b, s: stats(DB.brands[b], f, t) }));
  const dl30 = Array.from({ length: 30 }, (_, i) => addDays(today(), i - 29));
  const outAll = BIDS.flatMap(b => DB.brands[b].sales.filter(s => sBal(s) > 0).map(s => ({ s, b }))).sort((a, b) => sBal(b.s) - sBal(a.s));
  const cars = new Set(), svc = {};
  allBrandSales().forEach(({ s }) => { if (s.date >= f && s.date <= t) { cars.add(plate(s.car)); s.items.forEach(i => { const k = (i.desc || '—').trim(); svc[k] = (svc[k] || 0) + i.price; }); } });
  const inStudio = sum(BIDS, b => DB.brands[b].sales.filter(s => s.status !== 'Delivered').length);
  const topS = Object.entries(svc).sort((a, b) => b[1] - a[1]).slice(0, 6), topMax = topS.length ? topS[0][1] : 1;
  const acts = BIDS.flatMap(b => DB.brands[b].log.map(l => ({ ...l, b }))).sort((a, b) => a.t < b.t ? 1 : -1).slice(0, 9);
  const low = BIDS.flatMap(b => DB.brands[b].products.filter(p => p.qty <= p.min).map(p => ({ p, b })));
  const mon = BIDS.map(b => buckets(DB.brands[b], 'monthly', today()).slice(-6)), empt = !allBrandSales().length;
  $('#view').innerHTML = phead('Owner Console', 'Combined performance of all your brands', `<div class="tabs" id="aTabs">${RANGES.map(([k, l]) => `<button data-k="${k}" class="${k === aRange ? 'on' : ''}">${l}</button>`).join('')}</div>`) +
  (empt ? `<div class="card" style="margin-bottom:14px">${empty('chart', 'No data yet', 'Create bills inside each brand workspace, or load sample data to preview every dashboard.', `<button class="btn" id="demoBoth">Load demo data for both brands</button>`)}</div>` : '') + `
  <div class="grid k4">
    ${kpi('Group revenue', money(G.revenue), { icon: 'trend', delta: hasPrev ? pct(G.revenue, P.revenue) : undefined, sub: G.count + ' bills', spark: sp('revenue') })}
    ${kpi('Cash collected', money(G.cash), { icon: 'cash', tone: 'good', delta: hasPrev ? pct(G.cash, P.cash) : undefined, spark: sp('cash') })}
    ${kpi('Total expenses', money(G.exp), { icon: 'wallet', tone: 'bad', delta: hasPrev ? pct(G.exp, P.exp) : undefined, spark: sp('exp') })}
    ${kpi('Net profit', money(G.net), { icon: 'chart', tone: G.net >= 0 ? 'good' : 'bad', delta: hasPrev ? pct(G.net, P.net) : undefined, sub: G.margin.toFixed(0) + '% margin', spark: sp('net') })}
    ${kpi('Outstanding balance', money(sum(outAll, x => sBal(x.s))), { icon: 'alert', tone: 'warn', sub: outAll.length + ' open invoices (all time)' })}
    ${kpi('Vehicles served', cars.size, { icon: 'car', sub: 'unique in period' })}
    ${kpi('Cars in studios now', inStudio, { icon: 'jobs', tone: 'info', sub: 'across both brands' })}
    ${kpi('Product + labour cost', money(G.prod + G.lab), { icon: 'box', sub: 'direct job costs' })}</div>
  <div class="grid" style="margin-top:14px;grid-template-columns:repeat(auto-fit,minmax(340px,1fr))">${per.map(({ b, s }) => `<div class="card brandcard" style="border-top:3px solid ${BRANDS[b].color}">
    <div class="top"><img src="${BRANDS[b].logo}" alt=""><div class="sp"><h3 style="font-size:17px">${BRANDS[b].name}</h3><div class="muted">${s.count} bills · ${s.margin.toFixed(0)}% margin</div></div><button class="btn sm" data-open="${b}">Open ${ic('arrow', 14)}</button></div>
    <div class="mini"><div><small>Revenue</small><b>${money(s.revenue)}</b></div><div><small>Net profit</small><b style="color:${s.net >= 0 ? 'var(--good)' : 'var(--bad)'}">${money(s.net)}</b></div><div><small>Expenses</small><b>${money(s.exp)}</b></div><div><small>Cash collected</small><b>${money(s.cash)}</b></div></div>
    <div class="muted" style="font-size:12px;margin-bottom:5px">Share of group revenue</div><div class="bar"><i style="width:${G.revenue ? s.revenue / G.revenue * 100 : 0}%;background:${BRANDS[b].color}"></i></div></div>`).join('')}</div>
  <div class="cols"><div class="stack"><div class="card"><div class="ch"><h3>Revenue · last 30 days</h3>${legend(BIDS.map(b => ({ name: BRANDS[b].name, color: BRANDS[b].color })))}</div>
    ${lineSvg(dl30.map(niceS), BIDS.map(b => ({ name: BRANDS[b].name, color: BRANDS[b].color, data: dl30.map(x => stats(DB.brands[b], x, x).revenue) })))}</div>
    <div class="card"><div class="ch"><h3>Net profit by month · last 6 months</h3>${legend(BIDS.map(b => ({ name: BRANDS[b].name, color: BRANDS[b].color })))}</div>
    ${barSvg(mon[0].map(x => x.l), BIDS.map((b, i) => ({ name: BRANDS[b].name, color: BRANDS[b].color, data: mon[i].map(x => x.s.net) })), 250)}</div></div>
    <div class="stack"><div class="card"><h3>Revenue share</h3>${donut(per.map(x => ({ label: BRANDS[x.b].name, value: x.s.revenue, color: BRANDS[x.b].color })), 'Revenue')}</div>
    <div class="card"><h3>Top services (group)</h3>${topS.length ? `<div class="list">${topS.map(([k, v]) => `<div style="display:block"><div style="display:flex;justify-content:space-between"><span>${esc(k)}</span><b>${money(v)}</b></div><div class="bar" style="margin-top:6px"><i style="width:${v / topMax * 100}%;background:var(--accent)"></i></div></div>`).join('')}</div>` : '<div class="muted">No sales in this period.</div>'}</div></div></div>
  <div class="cols eq3"><div class="card"><h3>Largest outstanding balances</h3>${outAll.length ? `<div class="list">${outAll.slice(0, 7).map(({ s, b }) => `<div><span><b>${esc(s.car)}</b><small>${brandDot(b)} · ${esc(s.name)}</small></span><span style="display:flex;gap:8px;align-items:center"><b style="color:var(--warn)">${money(sBal(s))}</b><button class="btn ghost sm" onclick="viewSale('${s.id}','${b}')">View</button></span></div>`).join('')}</div>` : empty('check', 'Nothing outstanding')}</div>
    <div class="card"><h3>Recent activity</h3>${acts.length ? `<div class="list">${acts.map(a => `<div><span>${esc(a.text)}<small>${brandDot(a.b)} · ${new Date(a.t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></span></div>`).join('')}</div>` : '<div class="muted">No activity yet.</div>'}</div>
    <div class="card"><h3>Low stock alerts</h3>${low.length ? `<div class="list">${low.slice(0, 8).map(({ p, b }) => `<div><span>${esc(p.name)}<small>${brandDot(b)}</small></span><span class="chip low">${p.qty} ${esc(p.unit)}</span></div>`).join('')}</div>` : '<div class="muted">All stocked.</div>'}</div></div>`;
  $('#aTabs').onclick = e => { const b = e.target.closest('button'); if (b) { aRange = b.dataset.k; PAGES.a_overview(); } };
  $$('[data-open]', $('#view')).forEach(b => b.onclick = () => openBrand(b.dataset.open));
  if ($('#demoBoth')) $('#demoBoth').onclick = () => { BIDS.forEach(seedDemo); save(); toast('Demo data loaded'); refresh(); };
};

/* ================= TRANSACTIONS ================= */
let tf = { b: '', q: '', from: '', to: '', pay: '' };
PAGES.a_tx = () => {
  $('#view').innerHTML = phead('All Transactions', 'Every invoice from every brand in one place', `<button class="btn ghost" id="tCsv">${ic('download', 16)} Export CSV</button>`) + `<div class="card"><div class="tools">
    <div><label>Brand</label><select id="tb">${opts([['', 'All brands'], ...BIDS.map(b => [b, BRANDS[b].name])], tf.b)}</select></div><div class="grow"><label>Search</label><input id="tq" placeholder="Car no, name, phone, invoice…" value="${esc(tf.q)}"></div>
    <div><label>From</label><input id="tfrom" type="date" value="${tf.from}"></div><div><label>To</label><input id="tto" type="date" value="${tf.to}"></div>
    <div><label>Payment</label><select id="tpay">${opts([['', 'All'], ['paid', 'Paid'], ['part', 'Partial'], ['unpaid', 'Unpaid']], tf.pay)}</select></div></div><div id="tList"></div></div>`;
  const upd = () => { tf = { b: $('#tb').value, q: $('#tq').value, from: $('#tfrom').value, to: $('#tto').value, pay: $('#tpay').value }; renderTx(); };
  ['tb', 'tq', 'tfrom', 'tto', 'tpay'].forEach(i => $('#' + i).oninput = upd);
  $('#tCsv').onclick = () => dl('stratova-all-transactions.csv', csvText([['Brand', 'Invoice', 'Date', 'Car', 'Customer', 'Phone', 'Total', 'Paid', 'Balance', 'Product cost', 'Labour cost', 'Profit', 'Job status'], ...txList().map(({ s, b }) => [BRANDS[b].name, inv(s.no), s.date, s.car, s.name, s.phone, sTotal(s), sPaid(s), sBal(s), sProd(s), sLab(s), sProfit(s), s.status])]), 'text/csv');
  renderTx();
};
function txList() {
  const q = tf.q.toLowerCase().replace(/\s/g, '');
  return allBrandSales().filter(({ s, b }) => (!tf.b || b === tf.b) && (!tf.from || s.date >= tf.from) && (!tf.to || s.date <= tf.to) && (!tf.pay || payState(s)[0] === tf.pay) &&
    (!q || (plate(s.car) + (s.name + s.phone + inv(s.no) + s.model).toLowerCase().replace(/\s/g, '')).toLowerCase().includes(q))).sort((a, b) => a.s.date < b.s.date ? 1 : a.s.date > b.s.date ? -1 : b.s.no - a.s.no);
}
function renderTx() {
  const L = txList();
  $('#tList').innerHTML = `<div class="muted" style="margin-bottom:8px">${L.length} invoices · Total ${money(sum(L, x => sTotal(x.s)))} · Profit ${money(sum(L, x => sProfit(x.s)))} · Outstanding ${money(sum(L, x => Math.max(0, sBal(x.s))))}</div>` + salesTable(L.slice(0, 200), { brand: true });
}

/* ================= GROUP REPORTS ================= */
let gr = { from: monthStart(today()), to: today() };
PAGES.a_reports = () => {
  const per = BIDS.map(b => stats(DB.brands[b], gr.from, gr.to)), G = per.reduce(addStats), t = today();
  const pm = {}, cat = {};
  BIDS.forEach(b => { DB.brands[b].sales.forEach(s => s.payments.forEach(p => { if (p.date >= gr.from && p.date <= gr.to) pm[p.method] = (pm[p.method] || 0) + p.amount; })); DB.brands[b].expenses.filter(e => e.date >= gr.from && e.date <= gr.to).forEach(e => cat[e.cat] = (cat[e.cat] || 0) + e.amount); });
  const mon = BIDS.map(b => buckets(DB.brands[b], 'monthly', t));
  const rows = [['Bills', 'count', 0], ['Revenue', 'revenue', 1], ['Product cost', 'prod', 1], ['Labour cost', 'lab', 1], ['Gross profit', 'gross', 1], ['Expenses', 'exp', 1], ['Net profit', 'net', 1], ['Cash collected', 'cash', 1], ['New balance due', 'pending', 1]];
  const presets = [['Today', t, t], ['This week', weekStart(t), t], ['This month', monthStart(t), t], ['Last month', monthStart(addDays(monthStart(t), -1)), addDays(monthStart(t), -1)], ['This year', t.slice(0, 4) + '-01-01', t]];
  $('#view').innerHTML = phead('Group Reports', 'Profit & loss comparison across brands', `<button class="btn ghost" id="gPrint">${ic('print', 16)} Print</button><button class="btn ghost" id="gCsv">${ic('download', 16)} Export CSV</button>`) + `
  <div class="card"><div class="tools"><div><label>From</label><input id="gF" type="date" value="${gr.from}"></div><div><label>To</label><input id="gT" type="date" value="${gr.to}"></div>
    <div class="tabs">${presets.map((p, i) => `<button data-i="${i}">${p[0]}</button>`).join('')}</div></div>
  <div class="tw"><table><thead><tr><th>Metric</th>${BIDS.map(b => `<th class="r">${BRANDS[b].name}</th>`).join('')}<th class="r">Combined</th></tr></thead><tbody>
  ${rows.map(([l, k, m]) => `<tr><td>${l}</td>${[...per, G].map(s => `<td class="r ${k === 'net' ? 'nowrap' : ''}" style="${k === 'net' ? `font-weight:700;color:${s[k] >= 0 ? 'var(--good)' : 'var(--bad)'}` : ''}">${m ? money(s[k]) : s[k]}</td>`).join('')}</tr>`).join('')}
  <tr><td>Net margin</td>${[...per, G].map(s => `<td class="r">${s.margin.toFixed(1)}%</td>`).join('')}</tr></tbody></table></div></div>
  <div class="cols eq"><div class="card"><div class="ch"><h3>Monthly revenue by brand</h3>${legend(BIDS.map(b => ({ name: BRANDS[b].short, color: BRANDS[b].color })))}</div>${barSvg(mon[0].map(x => x.l), BIDS.map((b, i) => ({ name: BRANDS[b].name, color: BRANDS[b].color, data: mon[i].map(x => x.s.revenue) })), 260)}</div>
    <div class="card"><div class="ch"><h3>Monthly net profit by brand</h3>${legend(BIDS.map(b => ({ name: BRANDS[b].short, color: BRANDS[b].color })))}</div>${barSvg(mon[0].map(x => x.l), BIDS.map((b, i) => ({ name: BRANDS[b].name, color: BRANDS[b].color, data: mon[i].map(x => x.s.net) })), 260)}</div></div>
  <div class="cols eq"><div class="card"><h3>Payments by method</h3>${donut(Object.entries(pm).map(([k, v], i) => ({ label: k, value: v, color: PALETTE[i % PALETTE.length] })), 'Collected')}</div>
    <div class="card"><h3>Expenses by category</h3>${donut(Object.entries(cat).map(([k, v], i) => ({ label: k, value: v, color: PALETTE[i % PALETTE.length] })), 'Expenses')}</div></div>`;
  $('#gF').onchange = $('#gT').onchange = () => { gr.from = $('#gF').value || gr.from; gr.to = $('#gT').value || gr.to; PAGES.a_reports(); };
  $$('.tabs button', $('#view')).forEach(b => b.onclick = () => { const p = presets[+b.dataset.i]; gr = { from: p[1], to: p[2] }; PAGES.a_reports(); });
  $('#gCsv').onclick = () => dl('stratova-group-report.csv', csvText([['Metric', ...BIDS.map(b => BRANDS[b].name), 'Combined'], ...rows.map(([l, k]) => [l, ...[...per, G].map(s => Math.round(s[k]))])]), 'text/csv');
  $('#gPrint').onclick = () => printHTML(`<div class="inv report"><div class="band" style="background:#7c3aed"></div><div class="in"><h1>Stratova — Group report</h1><div>${nice(gr.from)} → ${nice(gr.to)}</div><h3>Profit & loss</h3>
    <table><thead><tr><th>Metric</th>${BIDS.map(b => `<th style="text-align:right">${BRANDS[b].name}</th>`).join('')}<th style="text-align:right">Combined</th></tr></thead><tbody>${rows.map(([l, k, m]) => `<tr><td>${l}</td>${[...per, G].map(s => `<td style="text-align:right">${m ? money(s[k]) : s[k]}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`);
};

/* ================= CUSTOMERS ================= */
let acq = '';
PAGES.a_customers = () => {
  $('#view').innerHTML = phead('All Customers', 'Vehicles across both brands — see who visits which studio') + `<div class="card"><div class="tools"><div class="grow"><label>Search</label><input id="acq" placeholder="Car number, name or phone" value="${esc(acq)}"></div></div><div id="acList"></div></div>`;
  const r = () => { const q = acq.toLowerCase().replace(/\s/g, ''); const L = carGroupsFrom(allBrandSales()).filter(g => !q || (g.key + (g.name + g.phone + g.model).toLowerCase().replace(/\s/g, '')).includes(q)); $('#acList').innerHTML = `<div class="muted" style="margin-bottom:8px">${L.length} vehicles · ${L.filter(g => g.brands.length > 1).length} use both brands</div>` + customersTable(L.slice(0, 300), true); };
  $('#acq').oninput = () => { acq = $('#acq').value; r(); }; r();
};

/* ================= ACCESS & DATA ================= */
PAGES.a_access = () => {
  const cred = (id, title, c, logo) => `<div class="card"><div class="ch"><h3>${title}</h3><img src="${logo}" style="width:34px;height:34px;border-radius:9px;object-fit:cover"></div><div class="fgrid"><div><label>Username</label><input data-u="${id}" value="${esc(c.user)}"></div><div><label>New password</label><input data-p="${id}" type="password" placeholder="Leave blank to keep"></div></div><button class="btn" data-save="${id}" style="margin-top:14px">Update</button></div>`;
  $('#view').innerHTML = phead('Access & Data', 'Manage logins, backups and sample data for every workspace') + `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
    ${cred('admin', 'Owner Console login', DB.admin, 'assets/Stratova.jpg')}${BIDS.map(b => cred(b, BRANDS[b].name + ' login', DB.brands[b], BRANDS[b].logo)).join('')}</div>
  <div class="cols eq"><div class="card"><h3>Full backup</h3><div class="muted" style="margin-bottom:12px">Includes every brand's invoices, expenses, staff, inventory and logins.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="fullBk">${ic('download', 16)} Download full backup</button><label class="btn ghost" style="margin:0;cursor:pointer">${ic('upload', 16)} Restore<input type="file" id="fullRs" accept=".json" class="hidden"></label></div></div>
    <div class="card"><h3>Demo & reset</h3><div class="muted" style="margin-bottom:12px">Sample data is tagged so it can be removed without touching your real records.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn soft" id="dAll">Load demo data (both brands)</button><button class="btn ghost" id="dClr">Remove all demo data</button><button class="btn danger" id="wipe">Erase everything</button></div></div></div>`;
  $$('[data-save]').forEach(b => b.onclick = () => { const id = b.dataset.save, c = id === 'admin' ? DB.admin : DB.brands[id], u = $(`[data-u="${id}"]`).value.trim(), p = $(`[data-p="${id}"]`).value; if (!u) return toast('Username is required', 'err'); c.user = u; if (p) c.pass = p; save(); toast('Credentials updated'); });
  $('#fullBk').onclick = () => dl(`stratova-full-backup-${today()}.json`, JSON.stringify(DB), 'application/json');
  $('#fullRs').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const x = JSON.parse(r.result); if (!x.brands) throw 0; confirmBox('All current data will be replaced by this backup.', () => { DB = x; save(); DB = loadDB(); toast('Backup restored'); refresh(); }, 'Restore'); } catch (_) { toast('Invalid backup file', 'err'); } }; r.readAsText(f); };
  $('#dAll').onclick = () => { BIDS.forEach(seedDemo); save(); toast('Demo data loaded'); };
  $('#dClr').onclick = () => confirmBox('All demo records will be removed. Real records stay.', () => { BIDS.forEach(clearDemo); save(); toast('Demo data removed'); }, 'Remove');
  $('#wipe').onclick = () => confirmBox('<b>Every</b> invoice, expense, customer and setting will be erased. This cannot be undone.', async () => { try { await wipeAll(); toast('All data erased'); refresh(); } catch (e) { toast(e.message, 'err'); } }, 'Erase everything');
};

/* ================= DEMO DATA ================= */
function seedDemo(id) {
  const d = DB.brands[id], R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a, P = a => a[R(0, a.length - 1)], t = today();
  if ([d.sales, d.expenses, d.staff, d.bookings, d.products].some(a => a.some(x => x.demo))) return;
  const names = ['Ahmed Khan', 'Bilal Sheikh', 'Usman Ali', 'Hamza Malik', 'Faisal Raza', 'Imran Butt', 'Zeeshan Iqbal', 'Ayesha Noor', 'Sana Tariq', 'Kamran Aslam', 'Saad Hussain', 'Omar Farooq', 'Hassan Javed', 'Talha Mehmood', 'Adeel Qureshi', 'Rizwan Ahmed', 'Noman Saeed', 'Fahad Mirza', 'Danish Anwar', 'Waqas Chaudhry', 'Mariam Zahid', 'Junaid Akram'];
  const models = ['Honda Civic 2021 – White', 'Toyota Corolla 2019 – Silver', 'Suzuki Cultus 2020 – Grey', 'Honda City 2022 – Black', 'Toyota Yaris 2021 – Red', 'KIA Sportage 2022 – White', 'Hyundai Tucson 2023 – Black', 'Toyota Fortuner 2020 – Pearl', 'Suzuki Alto 2021 – White', 'MG HS 2022 – Blue'];
  const people = [['Ali Raza', 'Senior Detailer', 55000], ['Hamid Shah', 'Detailer', 38000], ['Kashif Mehmood', 'Painter', 48000], ['Naveed Akhtar', 'Technician', 42000], ['Salman Yousaf', 'Helper', 28000]];
  const staffIds = []; people.forEach(([n, r, s], i) => { const m = { id: 'dst' + id + i, name: n, role: r, phone: '03' + R(0, 4) + R(10000000, 99999999), salary: s, demo: true }; d.staff.push(m); staffIds.push(m.id); });
  [['Car shampoo (5 L)', 'litre', 18, 1800, 6], ['Ceramic coating kit', 'pcs', 4, 14000, 3], ['Microfiber towels', 'pcs', 60, 250, 20], ['Polishing compound', 'litre', 5, 3200, 3], ['Foam cannon soap', 'litre', 2, 2400, 4], ['Interior cleaner', 'litre', 9, 1500, 4]]
    .forEach(([n, u, q, c, m], i) => d.products.push({ id: 'dp' + id + i, name: n, unit: u, qty: q, cost: c, min: m, demo: true }));
  const cust = names.map(n => ({ name: n, phone: '03' + R(0, 4) + R(0, 9) + R(1000000, 9999999), car: P(['LEA', 'LEB', 'LEC', 'LED', 'LXR', 'AGH', 'BKP']) + '-' + R(1000, 9999), model: P(models) }));
  const jit = (v, p) => Math.round(v * (1 + (Math.random() * 2 - 1) * p) / 100) * 100;
  for (let off = 59; off >= 0; off--) {
    const date = addDays(t, -off), n = Math.random() < .12 ? 0 : R(2, off < 20 ? 6 : 5);
    for (let k = 0; k < n; k++) {
      const c = P(cust), pool = [...d.services].sort(() => Math.random() - .5).slice(0, R(1, 3));
      const items = pool.map(sv => ({ desc: sv.name, price: jit(sv.price, .1), prod: jit(sv.prod, .1), lab: jit(sv.lab, .1) }));
      const s = { id: 'ds' + id + date + k + R(0, 9999), no: d.counter++, date, car: c.car, name: c.name, phone: c.phone, model: c.model, items, discount: Math.random() < .2 ? 500 * R(1, 4) : 0, taxPct: 0, note: '',
        status: off === 0 ? P(STATUSES) : off === 1 && Math.random() < .3 ? 'Ready' : 'Delivered', staff: P(staffIds), payments: [], created: new Date(pd(date).getTime() + R(9, 19) * 3600e3).toISOString(), demo: true };
      const tot = sTotal(s), r = Math.random();
      if (r < .72) s.payments.push({ date, amount: tot, method: P(PAY), note: 'Payment' });
      else if (r < .93) { const adv = Math.round(tot * (R(30, 60) / 100) / 100) * 100; s.payments.push({ date, amount: adv, method: P(PAY), note: 'Advance' }); if (off > 8 && Math.random() < .7) { const d2 = addDays(date, R(1, 6)); if (d2 <= t) s.payments.push({ date: d2, amount: tot - adv, method: P(PAY), note: 'Payment' }); } }
      d.sales.push(s);
    }
    const e = R(1, 3); for (let k = 0; k < e; k++) { const cat = P(['Product Purchase', 'Food & Tea', 'Fuel', 'Maintenance', 'Electricity', 'Other']); d.expenses.push({ id: 'de' + id + date + k, date, cat, note: cat === 'Food & Tea' ? 'Tea & lunch' : cat, amount: R(3, 30) * 100, demo: true }); }
    if (date.endsWith('-01')) { d.expenses.push({ id: 'der' + id + date, date, cat: 'Rent', note: 'Shop rent', amount: 120000, demo: true }); people.forEach(([n, , s], i) => d.expenses.push({ id: 'des' + id + date + i, date, cat: 'Salary', note: 'Salary – ' + n, amount: s, demo: true })); }
  }
  for (let i = 0; i < 5; i++) { const c = P(cust); d.bookings.push({ id: 'db' + id + i, date: addDays(t, i < 2 ? 0 : R(1, 6)), time: P(['09:30', '11:00', '13:00', '15:30', '17:00']), car: c.car, model: c.model, name: c.name, phone: c.phone, service: P(d.services).name, status: 'Scheduled', note: '', demo: true }); }
  d.log.push({ t: new Date().toISOString(), text: 'Demo data loaded' });
}
function clearDemo(id) {
  const d = DB.brands[id]; ['sales', 'expenses', 'staff', 'bookings', 'products'].forEach(k => d[k] = d[k].filter(x => !x.demo));
}
