import React, { useEffect, useRef, useState } from 'react';
import { examService } from '../services/examService';
import { syncProgress, SyncStatus } from '../services/syncService';

// Small online/offline + auto-save indicator (bottom-left). Syncs the saved answers every 15 seconds.
export const SyncStatusBadge: React.FC<{ examKey: string }> = ({ examKey }) => {
  const [online, setOnline] = useState(navigator.onLine);
  const [status, setStatus] = useState<SyncStatus>('LOCAL');
  const [savedAt, setSavedAt] = useState('');
  const busy = useRef(false);

  const doSync = async () => {
    if (busy.current) return;
    const data = examService.loadProgress(examKey);
    if (!data) return;
    busy.current = true;
    setStatus(await syncProgress(examKey, data));
    setSavedAt(new Date().toLocaleTimeString('en-GB'));
    busy.current = false;
  };

  useEffect(() => {
    const goOnline = () => { setOnline(true); doSync(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const timer = window.setInterval(doSync, 15000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.clearInterval(timer);
    };
  }, [examKey]);

  const text = !online
    ? 'Offline — answers are saved on this device'
    : status === 'QUEUED' ? 'Online — syncing pending answers…'
    : `Online — auto-saved${savedAt ? ` ${savedAt}` : ''}`;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] shadow-lg">
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      {text}
    </div>
  );
};
