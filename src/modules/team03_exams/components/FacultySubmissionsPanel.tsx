import React, { useEffect, useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Save, Inbox, AlertTriangle, RefreshCw } from 'lucide-react';
import { ExamAttempt } from '../types/exams.types';
import { examService } from '../services/examService';
import { applyMarkOverrides } from '../services/aiExamEngine';

// Live AI-evaluated submissions from real student exams (faculty view, with mark override).
export const FacultySubmissionsPanel: React.FC = () => {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Record<string, number>>>({});

  const load = () => setAttempts(examService.getAllAttempts());
  useEffect(load, []);

  const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.result.percent, 0) / attempts.length * 10) / 10 : 0;

  const saveOverrides = (a: ExamAttempt) => {
    const ov = edits[a.id];
    if (!ov) return;
    examService.saveAttempt({ ...a, result: applyMarkOverrides(a.result, ov) });
    setEdits(prev => { const n = { ...prev }; delete n[a.id]; return n; });
    load();
  };

  return (
    <div className="bg-white rounded-xl border border-cu-border p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h4 className="text-sm font-bold text-cu-navy flex items-center gap-2">
            <Sparkles size={16} className="text-amber-600" /> Student Submissions — AI Evaluated (Live)
          </h4>
          <p className="text-xs text-gray-500">Papers submitted by students in online exams are marked by the AI automatically. Review and change any mark if needed.</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 font-semibold">Submissions: {attempts.length}</span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold">Average: {avg}%</span>
          <button onClick={load} className="p-1.5 rounded hover:bg-gray-100" title="Refresh"><RefreshCw size={14} /></button>
        </div>
      </div>

      {attempts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Inbox size={28} className="text-gray-400" />
          <p className="text-xs text-gray-500">No student has submitted an online exam yet. Once a student submits, the AI-evaluated paper appears here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attempts.map(a => {
            const isOpen = open === a.id;
            const ov = edits[a.id] || {};
            return (
              <div key={a.id} className="rounded-xl border border-gray-200 overflow-hidden">
                <button onClick={() => setOpen(isOpen ? null : a.id)} className="w-full flex flex-wrap items-center justify-between gap-3 p-3 text-left hover:bg-gray-50">
                  <div className="text-xs">
                    <p className="font-bold text-gray-900">{a.studentName} <span className="font-mono text-gray-500">({a.studentRoll})</span></p>
                    <p className="text-gray-500">{a.subject} · {a.examTitle}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {a.violations > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                        <AlertTriangle size={11} /> {a.violations} violation{a.violations > 1 ? 's' : ''}{a.terminated ? ' · auto-submitted' : ''}
                      </span>
                    )}
                    <span className="font-bold text-cu-navy">{a.result.scoredMarks} / {a.result.totalMarks}</span>
                    <span className="font-bold">{a.result.grade}</span>
                    {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50/40">
                    {a.result.questions.map((q, i) => (
                      <div key={q.questionId} className="bg-white rounded-lg border border-gray-200 p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between gap-3">
                          <p className="font-semibold text-gray-900"><span className="text-cu-navy">Q{i + 1}.</span> {q.prompt}</p>
                          <label className="shrink-0 flex items-center gap-1.5 text-[11px] text-gray-600">
                            AI marks
                            <input
                              type="number" min={0} max={q.maxMarks} step={0.5}
                              value={ov[q.questionId] ?? q.awardedMarks}
                              onChange={e => setEdits(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || {}), [q.questionId]: Number(e.target.value) } }))}
                              className="w-16 border border-gray-300 rounded p-1 text-xs"
                            />
                            / {q.maxMarks}
                          </label>
                        </div>
                        <p><span className="font-semibold text-gray-600">Student answer: </span>{q.studentAnswer.trim() || <em className="text-gray-400">Not answered</em>}</p>
                        <p><span className="font-semibold text-emerald-700">Expected: </span><span className="text-gray-700">{q.correctAnswer}</span></p>
                        <p className="text-gray-600"><span className="font-semibold">AI reasoning: </span>{q.feedback}</p>
                      </div>
                    ))}
                    {Object.keys(ov).length > 0 && (
                      <button onClick={() => saveOverrides(a)} className="inline-flex items-center gap-1.5 bg-[#002561] text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-[#0E1B38]">
                        <Save size={13} /> Save Revised Marks
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
