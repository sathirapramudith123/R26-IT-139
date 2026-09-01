import { DB_NAME, DB_VERSION, DB_STORES } from "@/lib/constants/index";

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("IndexedDB not available in SSR")); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      DB_STORES.forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id", autoIncrement: true });
        }
      });
    };
    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror    = (e) => reject(e.target.error);
  });
}

export async function dbSet(storeName, record) {
  const db   = await openDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req  = record.id ? store.put(record) : store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function dbGet(storeName, id) {
  const db   = await openDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(storeName, "readonly");
    const req  = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

export async function dbGetAll(storeName) {
  const db   = await openDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(storeName, "readonly");
    const req  = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror   = () => reject(req.error);
  });
}

export async function dbDelete(storeName, id) {
  const db   = await openDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(storeName, "readwrite");
    const req  = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror   = () => reject(req.error);
  });
}

export async function dbClear(storeName) {
  const db   = await openDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(storeName, "readwrite");
    const req  = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve(true);
    req.onerror   = () => reject(req.error);
  });
}
