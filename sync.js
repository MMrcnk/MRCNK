// MRCNK – synchronizacja z Supabase (tabela records) + logowanie
import * as db from './db.js';

let client = null;
let user = null;
let busy = false;
let again = false;
let debounce = null;
const listeners = new Set();
export const status = { state: 'off', last: null, error: null };

function emit() { listeners.forEach((f) => f({ ...status, user })); }
export function onStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getUser() { return user; }
export function getClient() { return client; }

export function getCfg() {
  try { return JSON.parse(localStorage.getItem('mrcnk_sb') || 'null'); } catch { return null; }
}

export function setCfg(url, key) {
  if (!url || !key) localStorage.removeItem('mrcnk_sb');
  else localStorage.setItem('mrcnk_sb', JSON.stringify({ url: url.trim().replace(/\/$/, ''), key: key.trim() }));
  location.reload();
}

const lastKey = () => 'mrcnk_lastpull_' + (user ? user.id : '');

export async function initSync() {
  const c = getCfg();
  if (!c || !window.supabase) { status.state = 'off'; emit(); return; }
  try {
    client = window.supabase.createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mrcnk_auth' } });
    const { data } = await client.auth.getSession();
    user = data.session ? data.session.user : null;
    status.state = user ? 'ok' : 'login';
    emit();
    client.auth.onAuthStateChange((_e, s) => {
      user = s ? s.user : null;
      status.state = user ? 'ok' : 'login';
      emit();
      if (user) syncNow();
    });
    if (user) syncNow();
    setInterval(syncNow, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(); });
    window.addEventListener('online', syncNow);
    db.subscribe(() => {
      if (!user) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => { if (db.dirtyRecords().length) syncNow(); }, 1500);
    });
  } catch (e) {
    status.state = 'error'; status.error = e.message; emit();
  }
}

export async function signIn(email, password) {
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function signUp(email, password) {
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}
export async function signOut() {
  await client.auth.signOut();
  localStorage.removeItem(lastKey());
}

export async function syncNow() {
  if (!client || !user) return;
  if (!navigator.onLine) { status.state = 'offline'; emit(); return; }
  if (busy) { again = true; return; }
  busy = true;
  status.state = 'syncing'; emit();
  try {
    // 1. wypchnij zmiany
    const dirty = db.dirtyRecords();
    for (let i = 0; i < dirty.length; i += 200) {
      const chunk = dirty.slice(i, i + 200);
      const snap = chunk.map((r) => ({ id: r.id, updatedAt: r.updatedAt }));
      const rows = chunk.map((r) => ({ user_id: user.id, id: r.id, col: r.col, data: r.data, ts: r._ts, deleted: !!r.deleted }));
      const { error } = await client.from('records').upsert(rows, { onConflict: 'user_id,id' });
      if (error) throw error;
      db.markClean(snap);
    }
    // 2. pobierz zmiany
    let since = localStorage.getItem(lastKey()) || '1970-01-01T00:00:00Z';
    for (;;) {
      const { data, error } = await client.from('records').select('id,col,data,ts,deleted,updated_at')
        .gte('updated_at', since).order('updated_at', { ascending: true }).limit(1000);
      if (error) throw error;
      if (!data.length) break;
      db.applyRemote(data);
      const last = data[data.length - 1].updated_at;
      if (data.length < 1000 || last === since) { since = last; break; }
      since = last;
    }
    localStorage.setItem(lastKey(), since);
    status.state = 'ok'; status.last = new Date(); status.error = null;
  } catch (e) {
    status.state = 'error'; status.error = e.message || String(e);
  }
  busy = false;
  emit();
  if (again) { again = false; syncNow(); }
}

// wywołanie Edge Function (AI, push)
export async function invoke(name, body) {
  if (!client || !user) throw new Error('Najpierw połącz konto w Ustawieniach → Synchronizacja.');
  const { data, error } = await client.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return data;
}
