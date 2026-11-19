// 本地存储：照片放 IndexedDB（只在本机），小设置放 localStorage。
const DB = 'posemate', STORE = 'photos';
let dbp;

function db() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

function tx(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
  }));
}

export const addPhoto = (blob, poseId) =>
  tx('readwrite', (s) => s.put({ id: `${Date.now()}`, blob, poseId, createdAt: Date.now() }));
export const listPhotos = () =>
  tx('readonly', (s) => s.getAll()).then((rows) => rows.sort((a, b) => b.createdAt - a.createdAt));
export const deletePhoto = (id) => tx('readwrite', (s) => s.delete(id));

export const prefs = {
  get(key, fallback) {
    try { const v = localStorage.getItem('pm.' + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('pm.' + key, JSON.stringify(value)); } catch {}
  },
};
