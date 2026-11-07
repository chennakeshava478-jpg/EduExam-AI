import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Lock, Clock, FileText, PlayCircle, ShieldAlert, CheckCircle2, Award, BookOpen, Inbox } from 'lucide-react';
import { AssessmentItem, ExamAttempt } from '../types/exams.types';
import { examService } from '../services/examService';
import { evaluateAttemptWithLlm } from '../services/aiExamEngine';
import { LockdownExamShell, ExamFinishMeta } from './LockdownExamShell';
import { ExamResultView } from './ExamResultView';
import { ProctorAnomaly } from './ProctorCamera';
import { shuffleForStudent } from '../services/seededShuffle';
import { getExamWindow } from '../services/examWindow';
import { useAuth } from '../../../context/AuthContext';

type View = 'list' | 'instructions' | 'exam' | 'result';

export const StudentExamPortal: React.FC = () => {
  const { user } = useAuth();
  const studentId = user?.id || 'student';

  const [view, setView] = useState<View>('list');
  const [exams, setExams] = useState<AssessmentItem[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [selected, setSelected] = useState<AssessmentItem | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<ExamAttempt | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [now, setNow] = useState(Date.now());
  const tabCount = useRef(0);
  const aiFlags = useRef(0);

  // Keep the scheduled-window status (Upcoming / Open / Closed) fresh.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(t);
  }, []);

  // Per-student randomised order (stable across refreshes) and hard window end.
  const examQuestions = useMemo(
    () => (!selected ? [] : selected.shuffleQuestions === false ? selected.questions : shuffleForStudent(selected.questions, `${selected.id}|${studentId}`)),
    [selected, studentId]
  );
  const examEndsAt = useMemo(() => (selected ? getExamWindow(selected).endMs : undefined), [selected]);

  const refresh = () => {
    setExams(examService.getPublishedOnlineExams());
    setAttempts(examService.getAttempts(studentId));
  };
  useEffect(refresh, [studentId]);

  const attemptFor = (examId: string) => attempts.find(a => a.assessmentId === examId);
  const progressKey = (examId: string) => `${examId}_${studentId}`;

  const startExam = () => {
    if (!selected) return;
    if (!examService.loadProgress(progressKey(selected.id)) && getExamWindow(selected).state !== 'OPEN') {
      alert('This exam is not open right now. Check the scheduled window.');
      refresh();
      return;
    }
    tabCount.current = 0;
    aiFlags.current = 0;
    // Must run inside the click handler (user gesture) for fullscreen to be allowed.
    try { document.documentElement.requestFullscreen?.().catch(() => undefined); } catch { /* unsupported */ }
    setView('exam');
  };

  const handleFinish = async (answers: Record<string, string> = {}, meta: ExamFinishMeta = { warnings: 0, terminated: false }) => {
    if (!selected) return;
    setEvaluating(true);
    const result = await evaluateAttemptWithLlm(selected.questions, answers, { terminated: meta.terminated, subject: selected.subject || selected.title });
    const attempt: ExamAttempt = {
      id: `att_${Date.now()}`,
      assessmentId: selected.id,
      examTitle: selected.title,
      subject: selected.subject || selected.title,
      studentId,
      studentName: user?.name || 'Student',
      studentRoll: user?.employeeId || studentId,
      answers,
      submittedAt: new Date().toISOString(),
      violations: meta.warnings,
      terminated: meta.terminated,
      result,
      courseCode: selected.courseCode,
      assessmentType: selected.assessmentType
    };
    examService.saveAttempt(attempt);
    examService.clearProgress(progressKey(selected.id));
    refresh();
    setActiveAttempt(attempt);
    setEvaluating(false);
    setView('result');
  };

  const integrity = () => Math.max(0, 100 - tabCount.current * 10 - aiFlags.current * 5);

  const handleProctorEvent = (type: ProctorAnomaly, confidence: number, snapshot?: string) => {
    aiFlags.current += 1;
    examService.recordTelemetryViolation({
      studentRoll: user?.employeeId || studentId,
      studentName: user?.name || 'Student',
      anomalyType: type,
      timestamp: new Date().toLocaleTimeString('en-GB'),
      confidenceScore: confidence,
      tabSwitchCount: tabCount.current,
      integrityRating: integrity(),
      snapshot
    });
  };

  const handleViolation = (count: number) => {
    tabCount.current = count;
    examService.recordTelemetryViolation({
      studentRoll: user?.employeeId || studentId,
      studentName: user?.name || 'Student',
      anomalyType: 'TAB_SWITCH',
      timestamp: new Date().toLocaleTimeString('en-GB'),
      confidenceScore: 0.99,
      tabSwitchCount: count,
      integrityRating: integrity()
    });
  };

  // ───────────── AI is marking the paper ─────────────
  if (evaluating) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center bg-white rounded-xl border border-cu-border">
        <Loader2 size={34} className="animate-spin text-cu-navy" />
        <p className="font-bold text-cu-navy">Your paper has been submitted</p>
        <p className="text-xs text-gray-500">The AI is evaluating your answers. This may take a few seconds…</p>
      </div>
    );
  }

  // ───────────── Result ─────────────
  if (view === 'result' && activeAttempt) {
    return <ExamResultView attempt={activeAttempt} onBack={() => { setView('list'); setSelected(null); setActiveAttempt(null); }} />;
  }

  // ───────────── Live exam ─────────────
  if (view === 'exam' && selected) {
    return (
      <LockdownExamShell
        questions={examQuestions}
        endsAtMs={examEndsAt}
        onProctorEvent={handleProctorEvent}
        title={selected.title}
        durationMinutes={selected.durationMinutes}
        examKey={progressKey(selected.id)}
        strictMode
        showSimulator={false}
        onViolation={handleViolation}
        onFinish={handleFinish}
      />
    );
  }

  // ───────────── Instructions ─────────────
  if (view === 'instructions' && selected) {
    const resuming = !!examService.loadProgress(progressKey(selected.id));
    const rules = [
      'The exam opens in fullscreen mode. Do not exit fullscreen until you submit.',
      'Your webcam and microphone are used for AI proctoring (missing face, multiple faces, looking away, background speech). Video is analysed on your device and is not uploaded. Allow camera and microphone access when asked.',
      'Do NOT switch tabs, windows or applications. Every switch is recorded as a violation.',
      'After 3 violations your paper is automatically submitted and the exam ends.',
      'Copy, paste, right-click, print, developer tools and keyboard shortcuts are disabled.',
      'The timer keeps running even if you refresh. Your answers are auto-saved as you type.',
      'When the time ends, your paper is submitted automatically.',
      'Use "Save & Next" to move ahead, and "Submit Final Paper" on the last question to finish.'
    ];
    return (
      <div className="bg-white rounded-2xl border border-cu-border shadow-sm overflow-hidden">
        <div className="bg-[#002561] text-white p-5">
          <span className="text-[10px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-amber-200">EXAM INSTRUCTIONS</span>
          <h3 className="text-lg font-bold font-serif mt-1">{selected.title}</h3>
          <p className="text-xs text-slate-300">{selected.subject || selected.courseCode}</p>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3"><p className="text-gray-500">Duration</p><p className="font-bold text-cu-navy">{selected.durationMinutes} Minutes</p></div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3"><p className="text-gray-500">Total Marks</p><p className="font-bold text-cu-navy">{selected.totalMarks}</p></div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3"><p className="text-gray-500">Questions</p><p className="font-bold text-cu-navy">{selected.questions.length}</p></div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3"><p className="text-gray-500">Date</p><p className="font-bold text-cu-navy">{selected.scheduledDate}</p></div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
            <p className="text-xs font-bold text-amber-900 flex items-center gap-2"><ShieldAlert size={14} /> Please read carefully</p>
            <ol className="list-decimal ml-5 space-y-1.5 text-xs text-gray-800">
              {rules.map((r, i) => <li key={i}>{r}</li>)}
            </ol>
          </div>

          <label className="flex items-start gap-2 text-xs text-gray-800 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 accent-[#002561]" />
            <span>I have read and understood the instructions and agree to follow the examination integrity rules.</span>
          </label>

          <div className="flex justify-between">
            <button onClick={() => { setView('list'); setSelected(null); setAgreed(false); }} className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
            <button
              disabled={!agreed || (!resuming && getExamWindow(selected, now).state !== 'OPEN')}
              onClick={startExam}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow disabled:opacity-40"
            >
              <PlayCircle size={15} /> {resuming ? 'Resume Exam' : 'Start Exam'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────── Published exams list ─────────────
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-cu-navy flex items-center gap-2"><Lock size={18} /> Published Exams</h3>
        <p className="text-xs text-gray-500">Exams published by your faculty appear here. Select an exam to see the instructions and start.</p>
      </div>

      {exams.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center bg-white rounded-xl border border-cu-border">
          <Inbox size={36} className="text-gray-400" />
          <p className="font-bold text-cu-navy">No exams published yet</p>
          <p className="text-xs text-gray-500 max-w-sm">When your faculty publishes an online exam, the subject will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {exams.map(e => {
            const done = attemptFor(e.id);
            const win = getExamWindow(e, now);
            const canResume = !!examService.loadProgress(progressKey(e.id));
            return (
              <div key={e.id} className="bg-white rounded-xl border border-cu-border p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cu-saffron uppercase"><BookOpen size={13} /> {e.subject || e.courseCode}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {done ? 'SUBMITTED' : 'PUBLISHED'}
                  </span>
                </div>
                <h4 className="font-bold text-base text-cu-navy">{e.title}</h4>
                <div className="pt-2 text-xs text-gray-500 flex flex-wrap justify-between gap-2 border-t border-gray-100">
                  <span className="inline-flex items-center gap-1"><Clock size={12} /> {e.durationMinutes} Mins</span>
                  <span className="inline-flex items-center gap-1"><FileText size={12} /> {e.questions.length} Questions</span>
                  <span>Total Marks: {e.totalMarks}</span>
                </div>
                {win.label && (
                  <p className="text-[11px] text-gray-500">Exam window: <b className="text-cu-navy">{win.label}</b></p>
                )}
                {done ? (
                  <button
                    onClick={() => { setActiveAttempt(done); setView('result'); }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-cu-navy text-cu-navy rounded-lg text-xs font-bold hover:bg-blue-50"
                  >
                    <Award size={14} /> View Result — {done.result.scoredMarks} / {done.result.totalMarks}
                  </button>
                ) : win.state !== 'OPEN' && !canResume ? (
                  <button
                    disabled
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-200 text-gray-500 rounded-lg text-xs font-bold cursor-not-allowed"
                  >
                    <Lock size={14} /> {win.state === 'UPCOMING' ? `Opens ${new Date(win.startMs!).toLocaleString()}` : 'Exam window closed'}
                  </button>
                ) : (
                  <button
                    onClick={() => { setSelected(e); setAgreed(false); setView('instructions'); }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#002561] hover:bg-[#0E1B38] text-white rounded-lg text-xs font-bold transition"
                  >
                    <PlayCircle size={14} /> Open Exam
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {attempts.length > 0 && (
        <div className="bg-white rounded-xl border border-cu-border p-5 shadow-sm space-y-3">
          <h4 className="text-sm font-bold text-cu-navy flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> My Results</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                <tr><th className="p-3">Subject</th><th className="p-3">Exam</th><th className="p-3">Marks</th><th className="p-3">Grade</th><th className="p-3">Submitted</th><th className="p-3" /></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attempts.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-semibold text-gray-800">{a.subject}</td>
                    <td className="p-3 text-gray-600">{a.examTitle}</td>
                    <td className="p-3 font-bold text-cu-navy">{a.result.scoredMarks} / {a.result.totalMarks}</td>
                    <td className="p-3 font-bold">{a.result.grade}</td>
                    <td className="p-3 text-gray-500">{new Date(a.submittedAt).toLocaleString()}</td>
                    <td className="p-3"><button onClick={() => { setActiveAttempt(a); setView('result'); }} className="text-cu-navy font-semibold hover:underline">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
