import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, Eye, AlertTriangle, ShieldCheck, CheckCircle2, Clock, Terminal, Maximize } from 'lucide-react';
import { ExamQuestion } from '../types/exams.types';
import { examService } from '../services/examService';
import { KatexFormula } from './KatexFormula';
import { ProctorCamera, ProctorAnomaly } from './ProctorCamera';
import { SyncStatusBadge } from './SyncStatusBadge';
import { offlineStore } from '../services/offlineStore';

export interface ExamFinishMeta {
  warnings: number;
  terminated: boolean;
}

interface LockdownExamShellProps {
  questions: ExamQuestion[];
  onFinish: (answers?: Record<string, string>, meta?: ExamFinishMeta) => void;
  // ---- optional, used by the real student exam (all have safe defaults for the faculty preview) ----
  title?: string;
  durationMinutes?: number;
  examKey?: string;            // enables autosave + refresh-safe timer
  strictMode?: boolean;        // real enforcement: fullscreen lock, tab-switch detection, shortcut blocking
  showSimulator?: boolean;     // the "Simulate Tab Switch" demo button
  maxWarnings?: number;
  onViolation?: (count: number) => void;
  endsAtMs?: number;           // hard close of the scheduled exam window
  onProctorEvent?: (type: ProctorAnomaly, confidence: number, snapshot?: string) => void; // enables webcam + mic AI proctoring
}

const BLOCKED_CTRL_KEYS = ['c', 'v', 'x', 'p', 's', 'u', 'o', 't', 'n', 'w', 'r'];

export const LockdownExamShell: React.FC<LockdownExamShellProps> = ({
  questions, onFinish,
  title = 'PRG301 — Enterprise Cloud Systems Examination',
  durationMinutes = 90,
  examKey,
  strictMode = false,
  showSimulator = true,
  maxWarnings = 3,
  onViolation,
  endsAtMs,
  onProctorEvent
}) => {
  const saved = examKey ? examService.loadProgress(examKey) : null;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(saved?.answers || {});
  const [warnings, setWarnings] = useState(saved?.warnings || 0);
  const [secondsRemaining, setSecondsRemaining] = useState(durationMinutes * 60);
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [toast, setToast] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const startedAt = useRef<number>(saved?.startedAt || Date.now());
  const finished = useRef(false);
  const lastViolation = useRef(0);
  const answersRef = useRef(answers);
  const warningsRef = useRef(warnings);
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;
  answersRef.current = answers;
  warningsRef.current = warnings;

  const fsSupported = typeof document.documentElement.requestFullscreen === 'function';

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const exitFullscreen = () => {
    try {
      (navigator as any).keyboard?.unlock?.();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    } catch { /* ignore */ }
  };

  const finish = useCallback((terminated: boolean) => {
    if (finished.current) return;
    finished.current = true;
    exitFullscreen();
    onFinish(answersRef.current, { warnings: warningsRef.current, terminated });
  }, [onFinish]);

  const registerViolation = useCallback((message: string) => {
    const now = Date.now();
    if (now - lastViolation.current < 1500) return; // one incident → one warning (blur + visibility fire together)
    lastViolation.current = now;
    const next = warningsRef.current + 1;
    warningsRef.current = next;
    setWarnings(next);
    onViolationRef.current?.(next);
    if (next >= maxWarnings) setIsLocked(true);
    showToast(message);
  }, [maxWarnings, showToast]);

  const handleSimulateTabSwitch = () => {
    setWarnings(prev => {
      const next = prev + 1;
      if (next >= 3) {
        setIsLocked(true);
      }
      return next;
    });
  };

  // ── Timer (computed from the start timestamp so throttled/hidden tabs and refreshes stay accurate) ──
  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
      let remaining = durationMinutes * 60 - elapsed;
      if (endsAtMs) remaining = Math.min(remaining, Math.floor((endsAtMs - Date.now()) / 1000));
      setSecondsRemaining(Math.max(0, remaining));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [durationMinutes, endsAtMs]);

  useEffect(() => {
    if (strictMode && secondsRemaining === 0) finish(false); // time up → auto submit
  }, [secondsRemaining, strictMode, finish]);

  // ── Autosave (survives refresh / crash) ──
  useEffect(() => {
    if (examKey && !finished.current) {
      examService.saveProgress(examKey, { startedAt: startedAt.current, answers, warnings });
    }
  }, [answers, warnings, examKey]);

  // ── If the browser's localStorage copy is gone, restore answers from the IndexedDB copy ──
  useEffect(() => {
    if (!examKey || saved) return;
    offlineStore.loadProgress(examKey).then(p => {
      if (p && Object.keys(answersRef.current).length === 0) {
        startedAt.current = p.startedAt;
        setAnswers(p.answers);
        setWarnings(p.warnings);
      }
    });
  }, [examKey]);

  // ── Too many violations → auto-submit the paper ──
  useEffect(() => {
    if (strictMode && isLocked) finish(true);
  }, [strictMode, isLocked, finish]);

  // Leave fullscreen when the shell is really unmounted (deferred so React StrictMode's dev remount doesn't trigger it)
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.setTimeout(() => { if (!mountedRef.current) exitFullscreen(); }, 100);
    };
  }, []);

  // ── Real lockdown enforcement ──
  useEffect(() => {
    if (!strictMode) return;

    const enterFullscreen = () => {
      if (fsSupported && !document.fullscreenElement) {
        document.documentElement.requestFullscreen()
          .then(() => (navigator as any).keyboard?.lock?.(['Escape', 'Tab', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']).catch?.(() => undefined))
          .catch(() => undefined);
      }
    };
    enterFullscreen();

    const onVisibility = () => {
      if (document.hidden && !finished.current) registerViolation('Tab switch detected! Stay on the exam window.');
    };
    const onBlur = () => {
      if (!finished.current) registerViolation('Exam window lost focus! Do not switch windows or tabs.');
    };
    const onFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs && !finished.current) registerViolation('You exited fullscreen mode. Return to fullscreen to continue.');
    };
    const block = (e: Event) => { e.preventDefault(); showToast('Copy / paste / right-click is disabled during the exam.'); };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const blocked =
        e.key === 'F12' || e.key === 'PrintScreen' || e.key === 'F5' ||
        (ctrl && BLOCKED_CTRL_KEYS.includes(k)) ||
        (ctrl && e.shiftKey && ['i', 'j', 'c', 'n'].includes(k)) ||
        (e.altKey && (e.key === 'Tab' || e.key === 'F4' || e.key === 'ArrowLeft')) ||
        e.key === 'Escape' || e.key === 'Meta';
      if (blocked) {
        e.preventDefault();
        if (e.key === 'PrintScreen') navigator.clipboard?.writeText('').catch(() => undefined);
        showToast('That shortcut is disabled during the exam.');
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => { if (!finished.current) { e.preventDefault(); e.returnValue = ''; } };
    const onPopState = () => history.pushState(null, '', location.href); // disable the back button

    history.pushState(null, '', location.href);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('paste', block);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('paste', block);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strictMode]);

  const q = questions[currentIdx] || {
    id: 'q_demo',
    type: 'MCQ',
    prompt: 'Sample Question',
    marks: 5,
    bloomLevel: 'UNDERSTAND',
    options: ['Option A', 'Option B', 'Option C', 'Option D']
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = questions.filter(x => (answers[x.id] || '').trim()).length;
  const needsFullscreen = strictMode && fsSupported && !isFullscreen && !isLocked;

  return (
    <div className="bg-white rounded-2xl border border-cu-border shadow-xl overflow-hidden space-y-0 select-none">
      {/* Lockdown Title Bar */}
      <div className="bg-[#002561] text-white p-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-400 text-[#002561] rounded-lg shadow">
            <Lock size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-amber-200">
                LOCKDOWN MODE ACTIVE
              </span>
              <span className="text-xs text-gray-300">Fullscreen Interceptor &amp; DevTools Blocked</span>
            </div>
            <h3 className="text-base font-bold font-serif text-white">
              {title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 text-xs">
            <Clock size={16} className="text-amber-400" />
            <span className="font-mono font-bold text-amber-300 text-sm">
              {formatTime(secondsRemaining)}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 text-xs">
            <Eye size={16} className="text-emerald-400" />
            <span>AI Proctoring: OK</span>
          </div>

          {warnings > 0 && (
            <div className="flex items-center gap-1.5 bg-rose-600/80 px-2.5 py-1 rounded text-xs text-white animate-pulse">
              <AlertTriangle size={14} />
              <span>Warnings: {warnings} / {maxWarnings}</span>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs font-semibold px-4 py-2 flex items-center gap-2">
          <AlertTriangle size={14} /> {toast}
        </div>
      )}

      {isLocked ? (
        <div className="p-12 text-center space-y-4">
          <AlertTriangle size={56} className="mx-auto text-rose-600 animate-bounce" />
          <h3 className="text-xl font-bold text-rose-800">Exam Terminated Due to Integrity Violations</h3>
          <p className="text-xs text-gray-600 max-w-md mx-auto">
            Maximum permissible browser tab switches exceeded (3 violations recorded). Session snapshot submitted to examiner.
          </p>
          {!strictMode && (
            <button
              onClick={() => { setIsLocked(false); setWarnings(0); }}
              className="px-4 py-2 bg-[#002561] text-white rounded-lg text-xs font-semibold"
            >
              Reset Simulator
            </button>
          )}
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Question Nav & Header */}
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div className="text-xs font-semibold text-gray-500">
              Question <strong className="text-cu-navy text-sm">{currentIdx + 1}</strong> of {questions.length}
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[11px] font-semibold">
                Bloom Level: {q.bloomLevel}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 text-[11px] font-bold">
                {q.marks} Marks
              </span>
            </div>
          </div>

          {/* Question Prompt */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-900 leading-relaxed">
              {q.prompt}
            </div>

            {q.formulaLatex && (
              <div className="p-4 bg-slate-900 text-amber-300 font-mono text-sm rounded-xl border border-slate-800 shadow-inner">
                <KatexFormula latex={q.formulaLatex} />
              </div>
            )}
          </div>

          {/* Options / Essay Input */}
          {q.type === 'MCQ' && q.options && (
            <div className="space-y-2 pt-2">
              {q.options.map((opt, i) => (
                <label
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                    answers[q.id] === opt
                      ? 'border-[#002561] bg-blue-50/60 font-semibold text-cu-navy'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    className="accent-[#002561]"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {(q.type === 'SUBJECTIVE_ESSAY' || q.type === 'FORMULA_LATEX') && (
            <div className="pt-2">
              <textarea
                rows={5}
                placeholder="Type your technical response with architectural justification..."
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:outline-none focus:border-cu-navy font-mono select-text"
              />
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-gray-100">
            {showSimulator ? (
              <button
                onClick={handleSimulateTabSwitch}
                className="text-[11px] text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition font-medium"
              >
                Simulate Tab Switch (Test Anti-Cheat)
              </button>
            ) : (
              <span className="text-[11px] text-gray-500">Answered {answeredCount} of {questions.length}</span>
            )}

            <div className="flex gap-2">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="px-4 py-2 bg-[#002561] hover:bg-[#0E1B38] text-white rounded-lg text-xs font-semibold transition"
                >
                  Save &amp; Next
                </button>
              ) : (
                <button
                  onClick={() => (strictMode ? setConfirmSubmit(true) : finish(false))}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow"
                >
                  Submit Final Paper
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit confirmation (in-page so it never triggers a browser dialog / focus loss) */}
      {confirmSubmit && !isLocked && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
            <h4 className="text-base font-bold text-cu-navy">Submit your paper?</h4>
            <p className="text-xs text-gray-600">
              You have answered <b>{answeredCount}</b> of <b>{questions.length}</b> questions. You cannot change your answers after submitting.
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setConfirmSubmit(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">Go back</button>
              <button onClick={() => finish(false)} className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold">Yes, Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen lock overlay — exam content is hidden until the student returns to fullscreen */}
      {needsFullscreen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#050f1d]/95 p-6">
          <div className="max-w-sm text-center space-y-4 text-white">
            <Maximize size={44} className="mx-auto text-amber-400" />
            <h4 className="text-lg font-bold">Fullscreen required</h4>
            <p className="text-xs text-slate-300">
              The exam must stay in fullscreen. Leaving it counts as a violation ({warnings} / {maxWarnings} warnings). The timer is still running.
            </p>
            <button
              onClick={() => document.documentElement.requestFullscreen().catch(() => undefined)}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-[#0a1e3b] rounded-lg text-xs font-bold"
            >
              Return to Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Real webcam + microphone AI proctoring (student exam only) */}
      {strictMode && onProctorEvent && !isLocked && <ProctorCamera onEvent={onProctorEvent} />}

      {/* Online / offline + auto-save status (syncs every 15 s) */}
      {strictMode && examKey && <SyncStatusBadge examKey={examKey} />}
    </div>
  );
};
