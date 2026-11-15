// MRCNK – lokalna baza (IndexedDB) z polami znakowanymi czasem do synchronizacji
// Rekord: { id, col, data, _ts:{pole:ms}, deleted, dirty, updatedAt }

const DB_NAME = 'mrcnk';
const STORE = 'records';
let idb = null;
const mem = new Map();
const byCol = new Map();
const subs = new Set();
let version = 0;
let notifyQueued = false;
const cache = new Map();

function openIDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function index(rec) {
  if (!byCol.has(rec.col)) byCol.set(rec.col, new Set());
  byCol.get(rec.col).add(rec.id);
}

export async function initDB() {
  idb = await openIDB();
  const all = await new Promise((res, rej) => {
    const q = idb.transaction(STORE).objectStore(STORE).getAll();
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
  all.forEach((r) => { mem.set(r.id, r); index(r); });
}

function persist(recs) {
  if (!idb || !recs.length) return Promise.resolve();
  return new Promise((res) => {
    const tx = idb.transaction(STORE, 'readwrite');
    const st = tx.objectStore(STORE);
    recs.forEach((r) => st.put(r));
    tx.oncomplete = res;
    tx.onerror = res;
  });
}

function notify() {
  version++;
  cache.clear();
  if (notifyQueued) return;
  notifyQueued = true;
  queueMicrotask(() => { notifyQueued = false; subs.forEach((f) => f(version)); });
}

export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function getVersion() { return version; }

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2));

function view(rec) { return rec && !rec.deleted ? { ...rec.data, id: rec.id } : null; }

export function get(id) { return view(mem.get(id)); }

export function all(col) {
  const key = 'all:' + col;
  if (cache.has(key)) return cache.get(key);
  const ids = byCol.get(col);
  const out = [];
  if (ids) ids.forEach((id) => { const v = view(mem.get(id)); if (v) out.push(v); });
  cache.set(key, out);
  return out;
}

// zapis pól; ts=1 dla wartości domyślnych (każda zmiana z innego urządzenia wygrywa)
export function patch(col, id, fields, opts = {}) {
  id = id || uid();
  const now = opts.ts ?? Date.now();
  const prev = mem.get(id);
  const rec = prev ? { ...prev, data: { ...prev.data }, _ts: { ...prev._ts } } : { id, col, data: {}, _ts: {}, deleted: false };
  if (opts.ts && prev) return id; // domyślne nie nadpisują istniejących
  for (const [k, v] of Object.entries(fields)) {
    if (k === 'id') continue;
    rec.data[k] = v;
    rec._ts[k] = now;
  }
  if (rec.deleted) { rec.deleted = false; rec._ts._deleted = now; }
  rec.dirty = true;
  rec.updatedAt = Date.now();
  mem.set(id, rec);
  index(rec);
  persist([rec]);
  notify();
  return id;
}

export function put(col, obj, opts) { return patch(col, obj.id, obj, opts); }

export function remove(id) {
  const prev = mem.get(id);
  if (!prev) return;
  const rec = { ...prev, deleted: true, _ts: { ...prev._ts, _deleted: Date.now() }, dirty: true, updatedAt: Date.now() };
  mem.set(id, rec);
  persist([rec]);
  notify();
}

// ---- synchronizacja ----
export function dirtyRecords() { return [...mem.values()].filter((r) => r.dirty); }

export function markClean(snap) {
  const changed = [];
  snap.forEach((s) => {
    const r = mem.get(s.id);
    if (r && r.updatedAt === s.updatedAt) { r.dirty = false; changed.push(r); }
  });
  persist(changed);
}

export function applyRemote(rows) {
  const changed = [];
  for (const row of rows) {
    const local = mem.get(row.id);
    const rts = row.ts || {};
    const remote = { id: row.id, col: row.col, data: row.data || {}, _ts: rts, deleted: !!row.deleted };
    let rec;
    if (!local) {
      rec = { ...remote, dirty: false, updatedAt: Date.now() };
    } else {
      const data = { ...local.data };
      const ts = { ...local._ts };
      let deleted = local.deleted;
      for (const k of Object.keys(rts)) {
        if (k === '_deleted') continue;
        if ((rts[k] || 0) > (ts[k] || 0)) { data[k] = remote.data[k]; ts[k] = rts[k]; }
      }
      if ((rts._deleted || 0) > (ts._deleted || 0)) { deleted = remote.deleted; ts._deleted = rts._deleted; }
      const ahead = Object.keys(ts).some((k) => (ts[k] || 0) > (rts[k] || 0));
      rec = { ...local, col: row.col, data, _ts: ts, deleted, dirty: ahead, updatedAt: ahead ? local.updatedAt : Date.now() };
    }
    mem.set(rec.id, rec);
    index(rec);
    changed.push(rec);
  }
  persist(changed);
  if (changed.length) notify();
}

// ---- eksport / import ----
export function exportAll() {
  return { app: 'MRCNK', exportedAt: new Date().toISOString(), records: [...mem.values()].map(({ dirty, ...r }) => r) };
}

export async function importAll(json) {
  if (!json || !Array.isArray(json.records)) throw new Error('Nieprawidłowy plik kopii');
  const rows = json.records.map((r) => ({ id: r.id, col: r.col, data: r.data, ts: r._ts, deleted: r.deleted }));
  applyRemote(rows);
  // po imporcie wypchnij wszystko do chmury
  mem.forEach((r) => { r.dirty = true; });
  await persist([...mem.values()]);
  notify();
}

export async function wipeLocal() {
  mem.clear(); byCol.clear();
  await new Promise((res) => { const tx = idb.transaction(STORE, 'readwrite'); tx.objectStore(STORE).clear(); tx.oncomplete = res; });
  notify();
}
