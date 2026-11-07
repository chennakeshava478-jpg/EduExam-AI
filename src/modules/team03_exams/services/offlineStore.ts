// Offline resilience: IndexedDB copy of the in-progress exam + a queue of unsynced saves.
// Every call fails soft (returns null / does nothing) when IndexedDB is unavailable.

export interface ProgressData { startedAt: number; answers: Record<string, string>; warnings: number; }
interface QueueItem { examKey: string; data: ProgressData; queuedAt: number; }

const DB_NAME = 'team03_exams_offline';
const PROGRESS = 'progress';
const QUEUE = 'queue';

let dbPromise: Promise<IDBDatabase | null> | null = null;

const openDb = (): Promise<IDBDatabase | null> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PROGRESS)) db.createObjectStore(PROGRESS);
        if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: 'examKey' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
};

const run = async <T,>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> => {
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const req = fn(db.transaction(store, mode).objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
};

export const offlineStore = {
  saveProgress: (examKey: string, data: ProgressData) => run(PROGRESS, 'readwrite', s => s.put(data, examKey)),
  loadProgress: (examKey: string) => run<ProgressData | undefined>(PROGRESS, 'readonly', s => s.get(examKey)).then(r => r || null),
  clearProgress: (examKey: string) => run(PROGRESS, 'readwrite', s => s.delete(examKey)),

  // Latest save per exam wins, so the queue never grows while the student is offline.
  enqueue: (examKey: string, data: ProgressData) => run(QUEUE, 'readwrite', s => s.put({ examKey, data, queuedAt: Date.now() } as QueueItem)),
  dequeue: (examKey: string) => run(QUEUE, 'readwrite', s => s.delete(examKey)),
  getQueued: (examKey: string) => run<QueueItem | undefined>(QUEUE, 'readonly', s => s.get(examKey)).then(r => r || null)
};
