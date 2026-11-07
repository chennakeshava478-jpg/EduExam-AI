// Pushes the in-progress exam to a server every 15 s. While offline (or if the server fails) the latest
// save is queued in IndexedDB and re-sent automatically. Set VITE_SYNC_URL to enable the server push;
// without it the data stays safely on the device (status "LOCAL").
import { offlineStore, ProgressData } from './offlineStore';

export type SyncStatus = 'SYNCED' | 'QUEUED' | 'LOCAL';

const SYNC_URL = (import.meta as any).env?.VITE_SYNC_URL as string | undefined;

export const syncProgress = async (examKey: string, data: ProgressData): Promise<SyncStatus> => {
  if (!SYNC_URL) return 'LOCAL';
  if (!navigator.onLine) { await offlineStore.enqueue(examKey, data); return 'QUEUED'; }
  try {
    const res = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examKey, ...data, sentAt: Date.now() })
    });
    if (!res.ok) throw new Error(String(res.status));
    await offlineStore.dequeue(examKey);
    return 'SYNCED';
  } catch {
    await offlineStore.enqueue(examKey, data);
    return 'QUEUED';
  }
};
