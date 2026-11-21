/* Stratova core: store, helpers, charts, shell, login */
'use strict';

const KEY = 'stratova_v1';
const BRANDS = {
  detailing:  { id: 'detailing',  name: 'Detailing Aura',   short: 'Detailing',   logo: 'assets/Detailingaura.jpg',  color: '#ef2b3c' },
  autostudio: { id: 'autostudio', name: 'Aura Auto Studio', short: 'Auto Studio', logo: 'assets/Auraautostudio.jpg', color: '#fbb613' }
};
const BIDS = Object.keys(BRANDS);
const STATUSES = ['Queued', 'In Progress', 'Ready', 'Delivered'];
const PAY = ['Cash', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Card'];
const EXP_CATS = ['Salary', 'Rent', 'Electricity', 'Water', 'Product Purchase', 'Food & Tea', 'Fuel', 'Maintenance', 'Marketing', 'Other'];
const PALETTE = ['#8b5cf6', '#ec4899', '#ff7a2f', '#2fd08a', '#4ea1ff', '#ffb629', '#14b8a6', '#a3a3b8'];

const SEED = {
  detailing: [['Exterior Foam Wash', 1500, 300, 300], ['Interior Deep Cleaning', 6000, 1200, 1500], ['Engine Bay Detailing', 3500, 600, 800],
    ['Headlight Restoration', 4000, 700, 1000], ['Paint Correction (Stage 1)', 25000, 4000, 6000], ['Ceramic Coating', 65000, 22000, 10000], ['PPF - Front Bumper', 45000, 28000, 6000]],
  autostudio: [['Oil & Filter Change', 6500, 5200, 500], ['Denting & Painting (per panel)', 18000, 6500, 7000], ['Rubbing & Polishing', 8000, 1500, 2500],
    ['Full Car Wrap', 120000, 70000, 20000], ['Window Tinting', 22000, 12000, 3000], ['AC Service', 7500, 2500, 1500], ['Scanning & Diagnostics', 3000, 0, 1000]]
};

const ICON = {
  dash: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  bill: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  jobs: '<rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="4" height="8" rx="1.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  car: '<path d="M3 13l2-6a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 6v5h-3v-2H6v2H3z"/><circle cx="7.5" cy="14.5" r="1"/><circle cx="16.5" cy="14.5" r="1"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v9"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 4.5a3.5 3.5 0 0 1 0 7M22 20c0-2.8-1.8-4.8-4.5-5.6"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h14v4M3 7v11a2 2 0 0 0 2 2h16V9H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1"/>',
  chart: '<path d="M3 3v18h18M7 15l4-4 3 3 5-6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  print: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M6 14h12v7H6z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 18l-6-6 6-6"/>'
};
const ic = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[n] || ''}</svg>`;

/* ---------- store ---------- */
function blankBrand(id) {
  return {
    user: id, pass: 'aura123',
    profile: { phone: '', address: '', footer: 'Thank you for choosing us. We value your trust!', tax: 0, paper: 'A4' },
    sales: [], expenses: [], bookings: [], staff: [], products: [],
    services: SEED[id].map((x, i) => ({ id: 'sv' + i, name: x[0], price: x[1], prod: x[2], lab: x[3] })),
    counter: 1, log: []
  };
}
function loadDB() {
  let d = null;
  try { d = SERVER ? JSON.parse(JSON.stringify(__STATE)) : JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  d = d && typeof d === 'object' ? d : {};
  d.brands = d.brands || {};
  BIDS.forEach(id => {
    const b = blankBrand(id), o = d.brands[id] || {};
    d.brands[id] = Object.assign(b, o);
    d.brands[id].profile = Object.assign(b.profile, o.profile || {});
    d.brands[id].sales.forEach(s => { s.status = s.status || 'Delivered'; s.taxPct = s.taxPct || 0; s.staff = s.staff || ''; });
  });
  d.admin = Object.assign({ user: 'admin', pass: 'admin123' }, d.admin || {});
  d.theme = d.theme || 'dark';
  if (SERVER) { BIDS.forEach(id => delete d.brands[id].pass); delete d.admin.pass; } // passwords live only (hashed) on the server
  return d;
}
let DB = loadDB();
const S = { mode: null, B: null, page: '', fromAdmin: false };
const D = () => DB.brands[S.B];
function save() {
  if (SERVER) { __STATE = JSON.parse(JSON.stringify({ brands: DB.brands, admin: DB.admin, theme: DB.theme })); queueSync(); return; }
  try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast('Could not save data: ' + e.message, 'err'); }
}
function logAct(text) { const l = D().log; l.push({ t: new Date().toISOString(), text }); if (l.length > 300) l.shift(); }

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const sum = (a, f) => a.reduce((x, y) => x + f(y), 0);
const money = n => (n < 0 ? '-' : '') + 'Rs ' + Math.abs(Math.round(n)).toLocaleString('en-US');
const short = n => { const a = Math.abs(n); return (n < 0 ? '-' : '') + (a >= 1e6 ? (a / 1e6).toFixed(a % 1e6 ? 1 : 0) + 'M' : a >= 1e3 ? (a / 1e3).toFixed(a % 1e3 ? 1 : 0) + 'k' : Math.round(a)); };
const pad = n => String(n).padStart(2, '0');
const dstr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => dstr(new Date());
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return dstr(d); };
const weekStart = s => { const d = pd(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return dstr(d); };
const monthStart = s => s.slice(0, 8) + '01';
const monthEnd = s => { const d = pd(monthStart(s)); d.setMonth(d.getMonth() + 1); d.setDate(0); return dstr(d); };
const daysBetween = (a, b) => Math.round((pd(b) - pd(a)) / 864e5) + 1;
const nice = s => pd(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const niceS = s => pd(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const plate = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const inv = n => 'INV-' + String(n).padStart(4, '0');
const cap = s => s[0].toUpperCase() + s.slice(1);
const pct = (a, b) => (!b && !a) ? null : (!b ? 100 : (a - b) / Math.abs(b) * 100);
const opts = (list, sel) => list.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`; }).join('');
const refresh = () => go(S.page);
const cssId = s => String(s).replace(/\s/g, '');

function toast(m, type = '') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = m;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 2600);
}
function modal(html, cls = '') { const b = $('#modalBox'); b.className = 'box ' + cls; b.innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S.mode) { e.preventDefault(); openSearch(); }
});
function confirmBox(msg, onYes, label = 'Delete') {
  modal(`<div class="mh"><h2>Please confirm</h2></div><p>${msg}</p><div class="mf"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" id="cfOk" style="background:var(--bad);color:#fff">${label}</button></div>`, 'sm');
  $('#cfOk').onclick = () => { closeModal(); onYes(); };
}
function dl(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
const csvText = rows => rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
function waLink(ph, text) { let n = String(ph || '').replace(/\D/g, ''); if (n.startsWith('0')) n = '92' + n.slice(1); return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(text) : ''; }
function openWA(ph, text) { const u = waLink(ph, text); if (!u) return toast('No phone number saved for this customer', 'err'); window.open(u, '_blank'); }

/* generic form modal */
function fieldHtml(f, v) {
  const val = v ?? f.def ?? '';
  if (f.type === 'select') return `<select name="${f.k}">${opts(f.options, val)}</select>`;
  if (f.type === 'textarea') return `<textarea name="${f.k}" rows="2">${esc(val)}</textarea>`;
  return `<input name="${f.k}" type="${f.type || 'text'}" value="${esc(val)}" ${f.type === 'number' ? 'min="0" step="any"' : ''} placeholder="${esc(f.ph || '')}">`;
}
function formModal({ title, fields, values = {}, onSave, saveLabel = 'Save', sub = '' }) {
  modal(`<div class="mh"><div><h2>${title}</h2>${sub ? `<div class="muted">${sub}</div>` : ''}</div><button class="x" onclick="closeModal()">${ic('x')}</button></div>
    <form id="fm" class="fgrid">${fields.map(f => `<div class="${f.wide ? 'wide' : ''}"><label>${f.label}${f.req ? ' *' : ''}</label>${fieldHtml(f, values[f.k])}</div>`).join('')}</form>
    <div class="mf"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" id="fmOk">${saveLabel}</button></div>`, 'sm');
  $('#fm').onsubmit = e => { e.preventDefault(); $('#fmOk').click(); };
  $('#fmOk').onclick = () => {
    const o = {};
    for (const f of fields) {
      const el = $(`#fm [name="${f.k}"]`); let v = el.value;
      v = f.type === 'number' ? num(v) : v.trim();
      if (f.req && (v === '' || (f.type === 'number' && v <= 0 && f.pos))) { toast(f.label + ' is required', 'err'); el.focus(); return; }
      o[f.k] = v;
    }
    if (onSave(o) !== false) closeModal();
  };
  const first = $('#fm input,#fm select'); if (first) first.focus();
}

/* ---------- sale math ---------- */
const sSub = s => sum(s.items, i => i.price);
const sNet = s => Math.max(0, sSub(s) - (s.discount || 0));
const sTax = s => sNet(s) * (s.taxPct || 0) / 100;
const sTotal = s => sNet(s) + sTax(s);
const sPaid = s => sum(s.payments, p => p.amount);
const sBal = s => Math.round((sTotal(s) - sPaid(s)) * 100) / 100;
const sProd = s => sum(s.items, i => i.prod);
const sLab = s => sum(s.items, i => i.lab);
const sProfit = s => sNet(s) - sProd(s) - sLab(s);
const payState = s => { const b = sBal(s); return b <= 0 ? ['paid', 'Paid'] : sPaid(s) > 0 ? ['part', 'Partial'] : ['unpaid', 'Unpaid']; };
const payChip = s => { const [c, t] = payState(s); return `<span class="chip ${c}">${t}</span>`; };
const jobChip = st => `<span class="chip ${cssId(st)}">${st}</span>`;

function stats(d, from, to) {
  const inR = x => x >= from && x <= to;
  const r = { count: 0, revenue: 0, prod: 0, lab: 0, tax: 0, exp: 0, cash: 0, pending: 0 };
  d.sales.forEach(s => {
    if (inR(s.date)) { r.count++; r.revenue += sNet(s); r.tax += sTax(s); r.prod += sProd(s); r.lab += sLab(s); r.pending += Math.max(0, sBal(s)); }
    s.payments.forEach(p => { if (inR(p.date)) r.cash += p.amount; });
  });
  d.expenses.forEach(e => { if (inR(e.date)) r.exp += e.amount; });
  return fin(r);
}
function fin(r) { r.gross = r.revenue - r.prod - r.lab; r.net = r.gross - r.exp; r.margin = r.revenue ? r.net / r.revenue * 100 : 0; return r; }
function addStats(a, b) { const r = {}; Object.keys(a).forEach(k => r[k] = (typeof a[k] === 'number' ? a[k] + b[k] : a[k])); return fin(r); }

function periodRange(p, a) {
  if (p === 'daily') return [a, a];
  if (p === 'weekly') { const s = weekStart(a); return [s, addDays(s, 6)]; }
  return [monthStart(a), monthEnd(a)];
}
function buckets(d, p, a) {
  const out = [];
  if (p === 'daily') for (let i = 13; i >= 0; i--) { const x = addDays(a, -i); out.push({ l: niceS(x), f: x, t: x }); }
  else if (p === 'weekly') for (let i = 7; i >= 0; i--) { const s = addDays(weekStart(a), -7 * i); out.push({ l: niceS(s), f: s, t: addDays(s, 6) }); }
  else { const b = pd(monthStart(a)); for (let i = 11; i >= 0; i--) { const x = dstr(new Date(b.getFullYear(), b.getMonth() - i, 1)); out.push({ l: pd(x).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), f: x, t: monthEnd(x) }); } }
  return out.map(x => ({ ...x, s: stats(d, x.f, x.t) }));
}

/* ---------- UI atoms ---------- */
const dchip = (p, flip) => (p === null || !isFinite(p)) ? '' : `<span class="delta ${(p >= 0) !== !!flip ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p).toFixed(0)}%</span>`;
const kpi = (label, value, o = {}) => `<div class="card kpi ${o.tone || ''}"><div class="kh"><span class="kl">${label}</span><span class="ico">${ic(o.icon || 'chart')}</span></div><div class="kv">${value}</div><div class="ks">${o.delta !== undefined ? dchip(o.delta, o.tone === 'bad') : ''}<span>${o.sub || ''}</span></div>${o.spark && o.spark.length > 1 ? `<div class="spk">${spark(o.spark, SPK[o.tone || ''] || SPK[''])}</div>` : ''}</div>`;
const empty = (icon, title, text = '', btn = '') => `<div class="empty">${ic(icon, 40)}<h4>${title}</h4><div>${text}</div>${btn ? `<div style="margin-top:14px">${btn}</div>` : ''}</div>`;
const phead = (title, sub = '', actions = '') => `<div class="phead"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><div class="acts">${actions}</div></div>`;
const brandDot = b => `<span class="bdot" style="background:${BRANDS[b].color}"></span>${BRANDS[b].short}`;

/* ---------- charts (inline SVG) ---------- */
function gridAxis(W, H, pl, pt, pb, mn, mx) {
  const rng = mx - mn || 1, y = v => pt + (H - pt - pb) * (1 - (v - mn) / rng); let g = '';
  for (let i = 0; i <= 4; i++) { const v = mn + rng * i / 4, yy = y(v); g += `<line x1="${pl}" x2="${W}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="${pl - 8}" y="${yy + 4}" text-anchor="end" fill="var(--mute)" font-size="11">${short(v)}</text>`; }
  return { g, y };
}
let uid = 0;
const gradDef = (id, color) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color}"/><stop offset="1" style="stop-color:${color};stop-opacity:.4"/></linearGradient>`;
function barSvg(labels, series, H = 280) {
  const W = 900, pl = 54, pb = 30, pt = 12, n = labels.length, all = series.flatMap(s => s.data), id = 'bg' + (++uid);
  const mx = Math.max(1, ...all), mn = Math.min(0, ...all), { g: grid, y } = gridAxis(W, H, pl, pt, pb, mn, mx);
  const y0 = y(0), bw = (W - pl) / n, gw = bw * .72, w = gw / series.length, step = Math.ceil(n / 14); let g = `<defs>${series.map((s, j) => gradDef(id + j, s.color)).join('')}</defs>` + grid;
  labels.forEach((l, i) => {
    const x0 = pl + i * bw + (bw - gw) / 2;
    series.forEach((s, j) => { const v = s.data[i], yy = y(v); g += `<rect x="${x0 + j * w}" y="${Math.min(yy, y0)}" width="${Math.max(2, w - 3)}" height="${Math.max(1.5, Math.abs(yy - y0))}" rx="4" fill="url(#${id}${j})"><title>${l} · ${s.name}: ${money(v)}</title></rect>`; });
    if (i % step === 0) g += `<text x="${pl + i * bw + bw / 2}" y="${H - 9}" text-anchor="middle" fill="var(--mute)" font-size="11">${l}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
function lineSvg(labels, series, H = 280) {
  const W = 900, pl = 54, pb = 30, pt = 12, n = labels.length, mx = Math.max(1, ...series.flatMap(s => s.data));
  const { g: grid, y } = gridAxis(W, H, pl, pt, pb, 0, mx), x = i => pl + (W - pl - 12) * i / (n - 1 || 1), step = Math.ceil(n / 10); let g = grid;
  series.forEach(s => {
    const pts = s.data.map((v, i) => `${x(i)},${y(v)}`), line = 'M' + pts.join(' L');
    g += `<path d="${line} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z" style="fill:${s.color};opacity:.13"/><path d="${line}" fill="none" stroke-width="2.5" stroke-linejoin="round" style="stroke:${s.color}"/>`;
    s.data.forEach((v, i) => { g += `<circle cx="${x(i)}" cy="${y(v)}" r="3" style="fill:${s.color}"><title>${labels[i]} · ${s.name}: ${money(v)}</title></circle>`; });
  });
  labels.forEach((l, i) => { if (i % step === 0) g += `<text x="${x(i)}" y="${H - 9}" text-anchor="middle" fill="var(--mute)" font-size="11">${l}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
function areaSvg(labels, data, H = 190) {
  const W = 520, pl = 8, pr = 8, pt = 16, pb = 26, n = data.length, mx = Math.max(1, ...data), id = 'ar' + (++uid);
  const x = i => pl + (W - pl - pr) * i / (n - 1 || 1), y = v => pt + (H - pt - pb) * (1 - v / mx), pts = data.map((v, i) => [x(i), y(v)]);
  let d = 'M' + pts[0].join(',');
  for (let i = 1; i < n; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`; }
  const [lx, ly] = pts[n - 1]; let g = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.45"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>
    <line x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}" stroke="var(--line)"/><path d="${d} L${x(n - 1)},${H - pb} L${x(0)},${H - pb} Z" fill="url(#${id})"/>
    <path d="${d}" fill="none" stroke-width="3" stroke-linecap="round" style="stroke:var(--accent)"/><circle cx="${lx}" cy="${ly}" r="9" style="fill:var(--accent);opacity:.25"/><circle cx="${lx}" cy="${ly}" r="4.5" style="fill:var(--accent)"/>`;
  pts.forEach(([px, py], i) => { g += `<circle cx="${px}" cy="${py}" r="9" fill="transparent"><title>${labels[i]}: ${money(data[i])}</title></circle>`; });
  [0, Math.floor((n - 1) / 2), n - 1].forEach((i, k) => { g += `<text x="${x(i)}" y="${H - 8}" text-anchor="${k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}" fill="var(--mute)" font-size="11">${labels[i]}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
const SPK = { good: '#2fd08a', bad: '#ff5d73', warn: '#ffb629', info: '#4ea1ff', '': 'var(--accent)' };
function spark(data, color) {
  const W = 110, H = 36, n = data.length, mx = Math.max(...data), mn = Math.min(...data), rng = mx - mn || 1, x = i => W * i / (n - 1 || 1), y = v => H - 5 - (H - 10) * (v - mn) / rng;
  const d = data.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
  return `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d} L${W},${H} L0,${H} Z" style="fill:${color};opacity:.13"/><path d="${d}" fill="none" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" style="stroke:${color}"/></svg>`;
}
function donut(items, center = '') {
  items = items.filter(i => i.value > 0); const tot = sum(items, i => i.value);
  if (!tot) return '<div class="muted" style="padding:20px 0">No data for this period</div>';
  const R = 62, C = 2 * Math.PI * R; let off = 0, segs = '';
  items.forEach(i => { const len = i.value / tot * C; segs += `<circle cx="80" cy="80" r="${R}" fill="none" stroke-width="22" style="stroke:${i.color}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"><title>${esc(i.label)}: ${money(i.value)}</title></circle>`; off += len; });
  return `<div class="donut"><svg width="160" height="160" viewBox="0 0 160 160">${segs}<text x="80" y="76" text-anchor="middle" fill="var(--mute)" font-size="11">${esc(center)}</text><text x="80" y="96" text-anchor="middle" fill="var(--text)" font-size="16" font-weight="700">${short(tot)}</text></svg>
  <div class="lg">${items.map(i => `<div><span><i class="bdot" style="background:${i.color}"></i>${esc(i.label)}</span><b>${money(i.value)} <span class="muted">(${(i.value / tot * 100).toFixed(0)}%)</span></b></div>`).join('')}</div></div>`;
}
const legend = items => `<div class="legend">${items.map(i => `<span><i style="background:${i.color}"></i>${esc(i.name)}</span>`).join('')}</div>`;

/* ---------- shell & navigation ---------- */
const NAV_BRAND = [
  ['Workspace', [['dashboard', 'Dashboard', 'dash'], ['billing', 'New Bill', 'bill'], ['invoices', 'Invoices', 'list'], ['jobs', 'Job Board', 'jobs'], ['bookings', 'Appointments', 'calendar']]],
  ['Business', [['customers', 'Customers & Cars', 'car'], ['services', 'Service Catalog', 'tag'], ['inventory', 'Inventory', 'box'], ['staff', 'Team', 'users']]],
  ['Finance', [['expenses', 'Expenses', 'wallet'], ['reports', 'Reports', 'chart']]],
  ['System', [['settings', 'Settings', 'gear']]]
];
const NAV_ADMIN = [
  ['Owner Console', [['a_overview', 'Group Overview', 'dash'], ['a_tx', 'All Transactions', 'list'], ['a_reports', 'Group Reports', 'chart'], ['a_customers', 'All Customers', 'car']]],
  ['Control', [['a_access', 'Access & Data', 'shield']]]
];
const PAGES = {};

function renderShell() {
  const admin = S.mode === 'admin', nav = admin ? NAV_ADMIN : NAV_BRAND, B = BRANDS[S.B];
  $('#app').innerHTML = `
  <aside>
    <div class="brandbox"><img src="${admin ? 'assets/Stratova.jpg' : B.logo}" alt=""><div><b>${admin ? 'Stratova' : B.name}</b><small>${admin ? 'Owner Console' : 'Management Suite'}</small></div></div>
    <nav id="nav">${nav.map(([sec, items]) => `<div class="nsec">${sec}</div>` + items.map(([id, label, icon]) => `<button data-p="${id}">${ic(icon)}<span class="t">${label}</span>${id === 'jobs' ? '<span class="cnt hidden" id="jobCnt"></span>' : ''}</button>`).join('')).join('')}
      ${admin ? `<div class="nsec">Open Workspace</div>` + BIDS.map(b => `<button data-open="${b}"><img src="${BRANDS[b].logo}" style="width:18px;height:18px;border-radius:5px;object-fit:cover"><span class="t">${BRANDS[b].name}</span></button>`).join('') : ''}
    </nav>
    <div class="sfoot"><div class="avatar">${admin ? 'O' : B.name[0]}</div><div class="sp"><b>${admin ? 'Owner' : 'Manager'}</b><small>${admin ? 'All brands' : B.name}</small></div><button class="btn ghost icon" id="logout" title="Sign out">${ic('logout')}</button></div>
    <div class="powered"><img src="assets/Stratova.jpg" alt=""><span>Powered by Stratova</span></div>
  </aside>
  <div class="mainwrap">
    <div class="topbar">
      ${S.fromAdmin ? `<button class="btn ghost sm" id="backAdmin">${ic('back', 16)} Owner Console</button>` : ''}
      <div class="sbtn" id="sbtn">${ic('search', 16)}<span>Search cars, customers, invoices…</span><kbd>Ctrl K</kbd></div>
      <div class="sp"></div>
      ${admin ? '' : `<button class="btn sm" onclick="go('billing')">${ic('plus', 15)} New Bill</button>`}
      <span class="pill">${admin ? ic('shield', 15) + ' Owner view' : `<img src="${B.logo}" style="width:18px;height:18px;border-radius:5px;object-fit:cover">${B.name}`}</span>
      <button class="btn ghost icon" id="themeBtn" title="Toggle theme">${ic(DB.theme === 'dark' ? 'sun' : 'moon')}</button>
    </div>
    <main id="view"></main>
  </div>`;
  $('#nav').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.open) openBrand(b.dataset.open); else go(b.dataset.p); };
  $('#logout').onclick = logout; $('#sbtn').onclick = openSearch;
  $('#themeBtn').onclick = () => { DB.theme = DB.theme === 'dark' ? 'light' : 'dark'; save(); document.body.dataset.theme = DB.theme; $('#themeBtn').innerHTML = ic(DB.theme === 'dark' ? 'sun' : 'moon'); refresh(); };
  if ($('#backAdmin')) $('#backAdmin').onclick = backToAdmin;
}
function go(p, arg) {
  S.page = p;
  $$('#nav button[data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  const fn = PAGES[p]; if (!fn) return;
  const nv = (S.mode === 'admin' ? NAV_ADMIN : NAV_BRAND).flatMap(x => x[1]).find(x => x[0] === p);
  document.title = (nv ? nv[1] + ' · ' : '') + (S.mode === 'admin' ? 'Owner Console' : BRANDS[S.B].name) + ' — Stratova';
  $('#view').innerHTML = '';
  try { fn(arg); } catch (e) { console.error(e); $('#view').innerHTML = `<div class="card">${empty('alert', 'Something went wrong', esc(e.message))}</div>`; }
  window.scrollTo(0, 0); updateJobCount();
}
function updateJobCount() {
  const el = $('#jobCnt'); if (!el || S.mode !== 'brand') return;
  const n = D().sales.filter(s => s.status !== 'Delivered').length; el.textContent = n; el.classList.toggle('hidden', !n);
}
function openBrand(id) { S.mode = 'brand'; S.B = id; S.fromAdmin = true; draft = null; document.body.dataset.brand = id; saveSession(); renderShell(); go('dashboard'); }
function backToAdmin() { S.mode = 'admin'; S.fromAdmin = false; document.body.dataset.brand = 'admin'; saveSession(); renderShell(); go('a_overview'); }
async function logout() {
  try { if (SERVER) { await flushSync(); await api('POST', '/api/logout'); } sessionStorage.removeItem('stratova_s'); } catch (_) { }
  location.reload();
}
function saveSession() { try { sessionStorage.setItem('stratova_s', JSON.stringify({ mode: S.mode, B: S.B, fa: S.fromAdmin })); } catch (_) { } }

/* ---------- login ---------- */
let pick = null;
$$('.ws').forEach(c => c.onclick = () => {
  pick = c.dataset.w; $$('.ws').forEach(x => x.classList.toggle('sel', x === c));
  document.body.dataset.brand = pick; $('#loginForm').classList.remove('hidden'); $('#lerr').textContent = ''; $('#lu').focus();
});
$('#loginForm').onsubmit = async e => {
  e.preventDefault();
  if (SERVER) {
    try {
      await api('POST', '/api/login', { workspace: pick, username: $('#lu').value, password: $('#lp').value });
      await pullState();
      S.mode = pick === 'admin' ? 'admin' : 'brand'; S.B = pick === 'admin' ? null : pick; S.fromAdmin = false;
      saveSession(); start();
    } catch (err) { $('#lerr').textContent = err.message || 'Could not sign in.'; }
    return;
  }
  const cred = pick === 'admin' ? DB.admin : DB.brands[pick];
  if ($('#lu').value.trim() === cred.user && $('#lp').value === cred.pass) {
    S.mode = pick === 'admin' ? 'admin' : 'brand'; S.B = pick === 'admin' ? null : pick; S.fromAdmin = false;
    saveSession(); start();
  } else $('#lerr').textContent = 'Incorrect username or password.';
};
function start() {
  document.body.dataset.theme = DB.theme;
  document.body.dataset.brand = S.mode === 'admin' ? 'admin' : S.B;
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); renderShell();
  go(S.mode === 'admin' ? 'a_overview' : 'dashboard');
}
document.body.dataset.theme = DB.theme;

/* ---------- global search ---------- */
function allSales() {
  if (S.mode === 'admin') return BIDS.flatMap(b => DB.brands[b].sales.map(s => ({ s, b })));
  return D().sales.map(s => ({ s, b: S.B }));
}
function openSearch() {
  modal(`<div class="mh"><div class="sbtn" style="max-width:none;cursor:text">${ic('search', 16)}<input id="gs" placeholder="Type a car number, name, phone or invoice no…" style="border:0;background:none;box-shadow:none;padding:0"></div><button class="x" onclick="closeModal()">${ic('x')}</button></div><div class="sres" id="gres"></div>`);
  const run = () => {
    const q = $('#gs').value.toLowerCase().replace(/\s/g, ''); const R = $('#gres');
    if (!q) { R.innerHTML = '<div class="muted" style="padding:14px">Start typing to search across vehicles, customers and invoices.</div>'; return; }
    const all = allSales(), cars = {}, bills = [];
    all.forEach(({ s, b }) => {
      const hay = (plate(s.car) + (s.name + s.phone + s.model + inv(s.no)).toLowerCase().replace(/\s/g, '')).toLowerCase();
      if (hay.includes(q)) { bills.push({ s, b }); const k = plate(s.car); if (k && !cars[k]) cars[k] = s; }
    });
    const nav = (S.mode === 'admin' ? NAV_ADMIN : NAV_BRAND).flatMap(x => x[1]).filter(x => x[1].toLowerCase().replace(/\s/g, '').includes(q));
    let h = '';
    if (nav.length) h += '<div class="t">Go to</div>' + nav.map(n => `<button onclick="closeModal();go('${n[0]}')">${ic(n[2], 18)}<b>${n[1]}</b></button>`).join('');
    const cl = Object.entries(cars).slice(0, 6);
    if (cl.length) h += '<div class="t">Vehicles</div>' + cl.map(([k, s]) => `<button onclick="carHistory('${k}')">${ic('car', 18)}<div><b>${esc(s.car)}</b> <span class="muted">${esc(s.model)}</span><small class="sub">${esc(s.name)} ${esc(s.phone)}</small></div></button>`).join('');
    if (bills.length) h += '<div class="t">Invoices</div>' + bills.slice(0, 8).map(({ s, b }) => `<button onclick="viewSale('${s.id}','${b}')">${ic('bill', 18)}<div><b>${inv(s.no)}</b> · ${esc(s.car)} <span class="muted">${nice(s.date)}</span><small class="sub">${esc(s.name)} · ${money(sTotal(s))} ${S.mode === 'admin' ? '· ' + BRANDS[b].short : ''}</small></div></button>`).join('');
    R.innerHTML = h || '<div class="muted" style="padding:14px">No results found.</div>';
  };
  $('#gs').oninput = run; run(); $('#gs').focus();
}

/* ---------- boot ---------- */
window.addEventListener('DOMContentLoaded', async () => {
  if (SERVER) {  // resume an existing server session
    try {
      await pullState();
      const s = JSON.parse(sessionStorage.getItem('stratova_s') || 'null');
      if (__ROLE === 'admin') { S.mode = 'admin'; S.B = null; if (s && s.mode === 'brand' && DB.brands[s.B]) { S.mode = 'brand'; S.B = s.B; S.fromAdmin = true; } }
      else { S.mode = 'brand'; S.B = __WS; S.fromAdmin = false; }
      start();
    } catch (_) { /* not signed in: stay on login */ }
    return;
  }
  try {
    const s = JSON.parse(sessionStorage.getItem('stratova_s') || 'null');
    if (s && s.mode && (s.mode === 'admin' || DB.brands[s.B])) { S.mode = s.mode; S.B = s.B; S.fromAdmin = !!s.fa; start(); }
  } catch (_) { }
});
