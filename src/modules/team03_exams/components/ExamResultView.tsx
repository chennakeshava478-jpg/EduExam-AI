import React from 'react';
import { Award, CheckCircle2, XCircle, Lightbulb, Sparkles, AlertTriangle, ChevronLeft, TrendingUp, MinusCircle } from 'lucide-react';
import { ExamAttempt } from '../types/exams.types';

interface ExamResultViewProps {
  attempt: ExamAttempt;
  onBack: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({ attempt, onBack }) => {
  const r = attempt.result;
  const passed = r.percent >= 40;

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 transition"
      >
        <ChevronLeft size={14} /> Back to My Exams
      </button>

      {attempt.terminated && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>This paper was <b>auto-submitted</b> because the maximum number of tab-switch / fullscreen violations was reached. Only the answers saved up to that point were evaluated.</span>
        </div>
      )}

      {/* Score card */}
      <div className="bg-[#002561] text-white rounded-2xl p-6 shadow-lg flex flex-wrap items-center justify-between gap-5">
        <div className="space-y-1 max-w-xl">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold bg-white/15 px-2 py-0.5 rounded text-amber-200">
            <Sparkles size={11} /> AI EVALUATION{r.engine === 'LLM' ? ' · LLM' : ' · OFFLINE ENGINE'}
          </span>
          <h3 className="text-lg font-bold font-serif">{attempt.examTitle}</h3>
          <p className="text-xs text-slate-300">{attempt.subject} · Submitted {new Date(attempt.submittedAt).toLocaleString()} · Violations: {attempt.violations}</p>
          <p className="text-xs text-slate-200 pt-1">{r.summary}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-extrabold text-amber-300">{r.scoredMarks}<span className="text-base text-slate-300"> / {r.totalMarks}</span></p>
            <p className="text-[11px] text-slate-300">Marks obtained</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-white">{r.percent}%</p>
            <p className="text-[11px] text-slate-300">Percentage</p>
          </div>
          <div className="text-center">
            <p className={`text-3xl font-extrabold ${passed ? 'text-emerald-300' : 'text-rose-300'}`}>{r.grade}</p>
            <p className="text-[11px] text-slate-300">{passed ? 'Pass' : 'Needs improvement'}</p>
          </div>
        </div>
      </div>

      {/* Topic performance */}
      {r.topics.length > 0 && (
        <div className="bg-white rounded-xl border border-cu-border p-5 shadow-sm space-y-3">
          <h4 className="text-sm font-bold text-cu-navy flex items-center gap-2"><TrendingUp size={16} /> Topic-wise Performance</h4>
          <div className="space-y-2.5">
            {r.topics.map(t => (
              <div key={t.topic} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-800">{t.topic}</span>
                  <span className="text-gray-500">{t.scored} / {t.max} ({t.percent}%)</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${t.percent >= 75 ? 'bg-emerald-500' : t.percent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${t.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-5 shadow-sm space-y-3">
        <h4 className="text-sm font-bold text-cu-navy flex items-center gap-2"><Lightbulb size={16} className="text-amber-600" /> How to improve in {attempt.subject}</h4>
        <ul className="space-y-2 text-xs text-gray-800">
          {r.suggestions.map((s, i) => (
            <li key={i} className="flex gap-2"><span className="text-amber-600 font-bold">{i + 1}.</span><span>{s}</span></li>
          ))}
        </ul>
      </div>

      {/* Question review */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-cu-navy flex items-center gap-2"><Award size={16} /> Question-wise Review</h4>
        {r.questions.map((q, i) => {
          const full = q.isCorrect;
          const none = q.awardedMarks === 0;
          return (
            <div key={q.questionId} className={`bg-white rounded-xl border p-4 shadow-sm space-y-2 ${full ? 'border-emerald-200' : none ? 'border-rose-200' : 'border-amber-200'}`}>
              <div className="flex justify-between items-start gap-3">
                <p className="text-xs font-semibold text-gray-900"><span className="text-cu-navy">Q{i + 1}.</span> {q.prompt}</p>
                <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${full ? 'bg-emerald-100 text-emerald-800' : none ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                  {full ? <CheckCircle2 size={11} /> : none ? <XCircle size={11} /> : <MinusCircle size={11} />}
                  {q.awardedMarks} / {q.maxMarks}
                </span>
              </div>
              <div className="text-xs space-y-1">
                <p><span className="font-semibold text-gray-600">Your answer: </span><span className="text-gray-800">{q.studentAnswer.trim() || <em className="text-gray-400">Not answered</em>}</span></p>
                {!full && <p><span className="font-semibold text-emerald-700">{q.type === 'MCQ' ? 'Correct answer: ' : 'Expected answer: '}</span><span className="text-gray-700">{q.correctAnswer}</span></p>}
                <p className="text-gray-600"><span className="font-semibold">AI feedback: </span>{q.feedback}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
