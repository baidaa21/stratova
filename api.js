/* ================= SERVER SYNC =================
   When the app is served over http(s) by the Stratova backend it talks to /api.
   When opened directly from disk (file://) it keeps working offline on localStorage. */
const SERVER = location.protocol === 'http:' || location.protocol === 'https:';
let __STATE = null, __ROLE = null, __WS = null;
const __revs = {}, __sent = {};
let __timer = null, __busy = false, __again = false;

async function api(method, url, body) {
  const r = await fetch(url, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, keepalive: method !== 'GET' && JSON.stringify(body || '').length < 60000 });
  let j = null; try { j = await r.json(); } catch (_) { }
  if (!r.ok) throw Object.assign(new Error((j && j.error) || 'Request failed'), { status: r.status, body: j });
  return j;
}

/* Remember what the server already has so only changed brands are re-sent. */
function applyState(st) {
  __STATE = { brands: st.brands, admin: st.admin, theme: st.theme };
  __ROLE = st.role; __WS = st.workspace;
  Object.assign(__revs, st.revs || {});
  DB = loadDB();
  Object.keys(DB.brands).forEach(id => { __sent[id] = JSON.stringify(DB.brands[id]); });
  __sent.__admin = JSON.stringify(DB.admin); __sent.__theme = DB.theme;
}
async function pullState() { applyState(await api('GET', '/api/state')); }

function queueSync() { clearTimeout(__timer); __timer = setTimeout(flushSync, 500); }

async function flushSync() {
  if (!SERVER || !__ROLE) return;
  if (__busy) { __again = true; return; }
  const payload = { brands: {}, revs: {} };
  BIDS.forEach(id => {
    if (__ROLE !== 'admin' && id !== __WS) return;
    const s = JSON.stringify(DB.brands[id]);
    if (s !== __sent[id]) { payload.brands[id] = JSON.parse(s); payload.revs[id] = __revs[id]; }
  });
  if (__ROLE === 'admin' && JSON.stringify(DB.admin) !== __sent.__admin) payload.admin = DB.admin;
  if (DB.theme !== __sent.__theme) payload.theme = DB.theme;
  if (!Object.keys(payload.brands).length && !payload.admin && !payload.theme) return;
  __busy = true;
  try {
    const r = await api('PUT', '/api/state', payload);
    Object.assign(__revs, r.revs);
    Object.keys(payload.brands).forEach(id => { delete DB.brands[id].pass; __sent[id] = JSON.stringify(DB.brands[id]); });
    if (payload.admin) { delete DB.admin.pass; __sent.__admin = JSON.stringify(DB.admin); }
    if (payload.theme) __sent.__theme = payload.theme;
    __STATE = JSON.parse(JSON.stringify({ brands: DB.brands, admin: DB.admin, theme: DB.theme }));
  } catch (e) {
    if (e.status === 409) { toast('Data was changed on another device. Reloading latest data…', 'err'); try { await pullState(); refresh(); } catch (_) { } }
    else if (e.status === 401) { toast('Session expired. Please sign in again.', 'err'); setTimeout(() => location.reload(), 1200); }
    else if (e.status >= 400 && e.status < 500) { toast(e.message, 'err'); try { await pullState(); refresh(); } catch (_) { } }
    else { toast('Could not reach the server. Retrying…', 'err'); setTimeout(flushSync, 5000); }
  } finally { __busy = false; if (__again) { __again = false; queueSync(); } }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSync(); });

async function wipeAll() {
  if (!SERVER) { try { localStorage.removeItem(KEY); } catch (_) { } DB = loadDB(); return; }
  const r = await api('POST', '/api/admin/wipe'); applyState(r.state);
}
