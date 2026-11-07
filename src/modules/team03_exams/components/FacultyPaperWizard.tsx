import React, { useMemo, useState } from 'react';
import {
  Sparkles, PenLine, ChevronLeft, Plus, Trash2, ArrowUp, ArrowDown, Save, Send,
  Printer, MonitorPlay, CheckCircle2, AlertTriangle, BookOpen, X
} from 'lucide-react';
import { AssessmentItem, AssessmentComponent, ExamQuestion, FacultySubject, QuestionType } from '../types/exams.types';
import { ASSESSMENT_COMPONENTS, getComponentMeta } from '../services/assessmentComponents';
import { examService } from '../services/examService';
import { generateQuestions, extractOutlineTopics } from '../services/aiExamEngine';
import { printQuestionPaper } from '../services/printService';
import { useAuth } from '../../../context/AuthContext';

interface FacultyPaperWizardProps {
  subjects: FacultySubject[];
  initialSubject?: FacultySubject;
  editing?: AssessmentItem;
  onClose: () => void;
  onChanged: (list: AssessmentItem[]) => void;
}

type Step = 'subject' | 'method' | 'build';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

const inputCls = 'w-full border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:border-cu-navy bg-white';
const primaryBtn = 'inline-flex items-center gap-1.5 bg-[#002561] text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow hover:bg-[#0E1B38] transition disabled:opacity-40';
const ghostBtn = 'inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 transition';

const blankMcq = (): ExamQuestion => ({
  id: `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
  type: 'MCQ', prompt: '', options: ['', '', '', ''], correctAnswer: '', marks: 2, bloomLevel: 'UNDERSTAND'
});
const blankDescriptive = (): ExamQuestion => ({
  id: `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
  type: 'SUBJECTIVE_ESSAY', prompt: '', modelAnswer: '', marks: 5, bloomLevel: 'UNDERSTAND'
});

export const FacultyPaperWizard: React.FC<FacultyPaperWizardProps> = ({
  subjects, initialSubject, editing, onClose, onChanged
}) => {
  const { user } = useAuth();

  const editingSubject = editing
    ? subjects.find(s => s.code === editing.courseCode) || { code: editing.courseCode, name: editing.subject || editing.title }
    : undefined;

  const [subject, setSubject] = useState<FacultySubject | undefined>(editingSubject || initialSubject);
  const [step, setStep] = useState<Step>(editing ? 'build' : initialSubject ? 'method' : 'subject');
  const [method, setMethod] = useState<'MANUAL' | 'AI'>('MANUAL');

  // AI generator settings
  const [mcqCount, setMcqCount] = useState(5);
  const [shortCount, setShortCount] = useState(3);
  const [longCount, setLongCount] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');

  // Paper
  const [paperId] = useState(editing?.id || `exam_${Date.now()}`);
  const [title, setTitle] = useState(editing?.title || '');
  const [duration, setDuration] = useState(editing?.durationMinutes || 60);
  const [date, setDate] = useState(editing?.scheduledDate || new Date().toISOString().slice(0, 10));
  const [questions, setQuestions] = useState<ExamQuestion[]>(editing?.questions || []);
  const [startTime, setStartTime] = useState(editing?.startTime || '');
  const [endTime, setEndTime] = useState(editing?.endTime || '');
  const [shuffleQuestions, setShuffleQuestions] = useState(editing?.shuffleQuestions !== false);
  const [assessmentType, setAssessmentType] = useState<AssessmentComponent | ''>(editing?.assessmentType || '');

  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [showPublish, setShowPublish] = useState(false);

  const outline = useMemo(() => (subject ? examService.getOutline(subject) : null), [subject]);
  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);

  const updateQ = (id: string, patch: Partial<ExamQuestion>) =>
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...patch } : q)));

  const moveQ = (idx: number, dir: -1 | 1) =>
    setQuestions(prev => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const a = [...prev];
      [a[idx], a[j]] = [a[j], a[idx]];
      return a;
    });

  const runAi = (replace: boolean) => {
    if (!subject) return;
    const generated = generateQuestions({
      subjectName: subject.name,
      outlineText: outline?.text || '',
      mcqCount, shortCount, longCount, difficulty
    });
    setQuestions(prev => (replace ? generated : [...prev, ...generated]));
    if (!title) setTitle(`${subject.name} — Internal Assessment`);
    const needAnswer = generated.filter(q => q.type !== 'MCQ' && !(q.modelAnswer || '').trim()).length;
    setNotice(
      `AI generated ${generated.length} questions from the "${subject.name}" course outline. Review and edit anything you like below.` +
      (needAnswer ? ` ${needAnswer} descriptive question(s) are outside the AI's built-in knowledge — please add their model answers before publishing.` : '')
    );
    setStep('build');
  };

  const validate = (forPublish: boolean): string[] => {
    const errs: string[] = [];
    if (!title.trim()) errs.push('Enter a paper title.');
    if (startTime && endTime && endTime <= startTime) errs.push('Exam window: end time must be after the start time.');
    if (forPublish && !assessmentType) errs.push('Select the assessment type (FA-1, Mid-Term, FA-2, Presentation or Semester End Exam).');
    if (!questions.length) errs.push('Add at least one question.');
    if (forPublish) {
      questions.forEach((q, i) => {
        const n = `Q${i + 1}`;
        if (!q.prompt.trim()) errs.push(`${n}: question text is empty.`);
        if (!(Number(q.marks) > 0)) errs.push(`${n}: marks must be greater than 0.`);
        if (q.type === 'MCQ') {
          const filled = (q.options || []).filter(o => o.trim());
          if (filled.length < 2) errs.push(`${n}: provide at least two options.`);
          if (!q.correctAnswer || !filled.includes(String(q.correctAnswer))) errs.push(`${n}: select the correct option.`);
        } else if (!(q.modelAnswer || '').trim()) {
          errs.push(`${n}: add a model answer so the AI can evaluate student answers.`);
        }
      });
    }
    return errs;
  };

  const build = (status: AssessmentItem['status'], mode?: 'ONLINE' | 'PRINT'): AssessmentItem => ({
    id: paperId,
    title: title.trim(),
    courseCode: subject?.code || editing?.courseCode || 'GEN',
    subject: subject?.name || editing?.subject,
    durationMinutes: Number(duration) || 60,
    totalMarks,
    scheduledDate: date,
    assessmentType: assessmentType || undefined,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
    shuffleQuestions,
    status,
    mode,
    questions: questions.map(q => (q.type === 'MCQ' ? { ...q, options: (q.options || []).map(o => o.trim()).filter(Boolean) } : q)),
    isLockedDueToAttendanceShortage: false,
    createdBy: user?.name,
    publishedAt: status === 'PUBLISHED' ? new Date().toISOString() : undefined
  });

  const handleSave = () => {
    const errs = validate(false);
    setErrors(errs);
    if (errs.length) return;
    // Keep a published paper published when it is re-saved after an edit.
    const keep = editing?.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
    onChanged(examService.saveAssessment(build(keep, keep === 'PUBLISHED' ? editing?.mode : undefined)));
    setNotice('Question paper saved.');
  };

  const handlePublishClick = () => {
    const errs = validate(true);
    setErrors(errs);
    if (!errs.length) setShowPublish(true);
  };

  const finishPublish = (mode: 'ONLINE' | 'PRINT') => {
    const paper = build('PUBLISHED', mode);
    onChanged(examService.saveAssessment(paper));
    if (mode === 'PRINT') {
      if (!printQuestionPaper(paper)) alert('Pop-up blocked — allow pop-ups for this site to print the paper.');
    } else {
      alert(`"${paper.title}" is now published. Students will see it under "Enter Exam".`);
    }
    onClose();
  };

  // ───────────────────────── Render ─────────────────────────

  const stepper = (
    <div className="flex items-center gap-2 text-[11px] font-semibold">
      {(['subject', 'method', 'build'] as Step[]).map((s, i) => {
        const labels = ['1. Subject', '2. Method', '3. Set & Publish'];
        const active = step === s;
        return (
          <span key={s} className={`px-2.5 py-1 rounded-full ${active ? 'bg-[#002561] text-white' : 'bg-gray-100 text-gray-500'}`}>
            {labels[i]}
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onClose} className={ghostBtn}>
          <ChevronLeft size={14} /> Back to Exam Papers
        </button>
        {stepper}
      </div>

      {/* STEP 1 — AI asks for the subject */}
      {step === 'subject' && (
        <div className="bg-white rounded-xl border border-cu-border p-6 shadow-sm space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700"><Sparkles size={18} /></div>
            <div>
              <p className="text-sm font-bold text-cu-navy">Which subject are you preparing the question paper for?</p>
              <p className="text-xs text-gray-500">Pick one of the subjects you teach. The AI uses that subject's course outline to set the paper.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjects.map(s => (
              <button
                key={s.code}
                onClick={() => { setSubject(s); setStep('method'); }}
                className="text-left p-4 rounded-xl border border-gray-200 hover:border-cu-navy hover:bg-blue-50/40 transition flex items-center gap-3"
              >
                <BookOpen size={18} className="text-cu-navy shrink-0" />
                <span>
                  <span className="block text-sm font-bold text-cu-navy">{s.name}</span>
                  <span className="block text-[11px] text-gray-500 font-mono">{s.code}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2 — manual or AI */}
      {step === 'method' && subject && (
        <div className="bg-white rounded-xl border border-cu-border p-6 shadow-sm space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700"><Sparkles size={18} /></div>
            <div>
              <p className="text-sm font-bold text-cu-navy">Setting paper for: {subject.name} <span className="font-mono text-xs text-gray-500">({subject.code})</span></p>
              <p className="text-xs text-gray-500">How would you like to prepare the questions?</p>
            </div>
          </div>

          {outline && outline.text.trim() && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">
                Course outline {outline.fileName ? `— ${outline.fileName}` : ''}
              </p>
              <pre className="text-[11px] text-gray-700 whitespace-pre-wrap font-sans max-h-28 overflow-y-auto">{outline.text}</pre>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setMethod('MANUAL')}
              className={`text-left p-4 rounded-xl border-2 transition ${method === 'MANUAL' ? 'border-cu-navy bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <PenLine size={18} className="text-cu-navy mb-2" />
              <p className="text-sm font-bold text-cu-navy">Manual</p>
              <p className="text-xs text-gray-500">I will write every question myself.</p>
            </button>
            <button
              onClick={() => setMethod('AI')}
              className={`text-left p-4 rounded-xl border-2 transition ${method === 'AI' ? 'border-amber-500 bg-amber-50/60' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <Sparkles size={18} className="text-amber-600 mb-2" />
              <p className="text-sm font-bold text-cu-navy">With AI</p>
              <p className="text-xs text-gray-500">AI generates questions from the outline — I can edit all of them.</p>
            </button>
          </div>

          {method === 'AI' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <label className="space-y-1"><span className="font-semibold text-gray-600">MCQs (2 marks)</span>
                  <input type="number" min={0} max={30} value={mcqCount} onChange={e => setMcqCount(Math.max(0, Number(e.target.value)))} className={inputCls} /></label>
                <label className="space-y-1"><span className="font-semibold text-gray-600">Short answers (5 marks)</span>
                  <input type="number" min={0} max={20} value={shortCount} onChange={e => setShortCount(Math.max(0, Number(e.target.value)))} className={inputCls} /></label>
                <label className="space-y-1"><span className="font-semibold text-gray-600">Long answers (10 marks)</span>
                  <input type="number" min={0} max={10} value={longCount} onChange={e => setLongCount(Math.max(0, Number(e.target.value)))} className={inputCls} /></label>
                <label className="space-y-1"><span className="font-semibold text-gray-600">Difficulty</span>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} className={inputCls}>
                    <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                  </select></label>
              </div>
              <button
                onClick={() => runAi(true)}
                disabled={mcqCount + shortCount + longCount === 0}
                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-[#0a1e3b] px-4 py-2 rounded-lg text-xs font-bold shadow transition disabled:opacity-40"
              >
                <Sparkles size={14} /> Generate Questions with AI
              </button>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep('subject')} className={ghostBtn}>Change Subject</button>
            {method === 'MANUAL' && (
              <button
                onClick={() => {
                  if (!title) setTitle(`${subject.name} — Internal Assessment`);
                  if (!questions.length) setQuestions([blankMcq()]);
                  setStep('build');
                }}
                className={primaryBtn}
              >
                Start Writing Questions
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 3 — build / edit / save / publish */}
      {step === 'build' && (
        <div className="space-y-5">
          {notice && (
            <div className="flex items-start gap-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              <span className="flex-1">{notice}</span>
              <button onClick={() => setNotice('')}><X size={12} /></button>
            </div>
          )}

          {/* Action bar: stays visible while scrolling through the questions */}
          <div className="sticky top-[76px] z-20 flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur border border-cu-border rounded-xl px-4 py-2.5 shadow-sm">
            <p className="text-xs text-gray-600">
              <b className="text-cu-navy">{questions.length}</b> questions · <b className="text-cu-navy">{totalMarks}</b> marks — edit below, then Save or Publish
            </p>
            <div className="flex gap-2">
              <button onClick={handleSave} className={ghostBtn}><Save size={14} /> Save</button>
              <button onClick={handlePublishClick} className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition">
                <Send size={14} /> Publish (Print / Online)
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-cu-border p-5 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <label className="md:col-span-2 space-y-1"><span className="font-semibold text-gray-600">Paper title</span>
              <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Python Programming — Mid-Term" /></label>
            <label className="space-y-1"><span className="font-semibold text-gray-600">Duration (minutes)</span>
              <input type="number" min={5} value={duration} onChange={e => setDuration(Number(e.target.value))} className={inputCls} /></label>
            <label className="space-y-1"><span className="font-semibold text-gray-600">Exam date</span>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></label>
            <label className="md:col-span-2 space-y-1"><span className="font-semibold text-gray-600">Assessment type (60:40 NEP gradebook)</span>
              <select value={assessmentType} onChange={e => setAssessmentType(e.target.value as AssessmentComponent | '')} className={inputCls}>
                <option value="">Select assessment type…</option>
                {ASSESSMENT_COMPONENTS.map(c => (
                  <option key={c.value} value={c.value}>{c.label} — max {c.maxMarks} marks</option>
                ))}
              </select>
              {assessmentType && (
                <span className="block text-[10px] text-gray-500">
                  Student scores are scaled to {getComponentMeta(assessmentType)?.maxMarks} marks and sent to the gradebook automatically.
                </span>
              )}
            </label>
            <label className="space-y-1"><span className="font-semibold text-gray-600">Window opens (optional)</span>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputCls} /></label>
            <label className="space-y-1"><span className="font-semibold text-gray-600">Window closes (optional)</span>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputCls} /></label>
            <label className="md:col-span-4 flex items-center gap-2 text-gray-700 cursor-pointer">
              <input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} className="accent-[#002561]" />
              <span className="font-semibold">Shuffle questions &amp; MCQ options for each student</span>
            </label>
            <div className="md:col-span-4 flex flex-wrap gap-4 text-[11px] text-gray-500">
              <span>Subject: <b className="text-cu-navy">{subject?.name || editing?.title}</b></span>
              <span>Questions: <b className="text-cu-navy">{questions.length}</b></span>
              <span>Total marks: <b className="text-cu-navy">{totalMarks}</b></span>
            </div>
          </div>

          <datalist id="paper-topic-suggestions">
            {extractOutlineTopics(outline?.text || '').map(t => <option key={t} value={t} />)}
          </datalist>

          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-xl border border-cu-border p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-cu-navy">Q{idx + 1}</span>
                  {q.aiGenerated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      <Sparkles size={10} /> AI generated
                    </span>
                  )}
                  <select
                    value={q.type}
                    onChange={e => {
                      const t = e.target.value as QuestionType;
                      updateQ(q.id, t === 'MCQ'
                        ? { type: t, options: q.options?.length ? q.options : ['', '', '', ''], correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : '' }
                        : { type: t });
                    }}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-[11px]"
                  >
                    <option value="MCQ">Multiple choice</option>
                    <option value="SUBJECTIVE_ESSAY">Descriptive</option>
                    <option value="FORMULA_LATEX">Formula / derivation</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveQ(idx, -1)} disabled={idx === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30" title="Move up"><ArrowUp size={13} /></button>
                  <button onClick={() => moveQ(idx, 1)} disabled={idx === questions.length - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30" title="Move down"><ArrowDown size={13} /></button>
                  <button onClick={() => setQuestions(prev => prev.filter(x => x.id !== q.id))} className="p-1.5 rounded hover:bg-rose-50 text-rose-600" title="Delete question"><Trash2 size={13} /></button>
                </div>
              </div>

              <textarea
                rows={2}
                value={q.prompt}
                onChange={e => updateQ(q.id, { prompt: e.target.value })}
                placeholder="Type the question here..."
                className={inputCls}
              />

              {q.type === 'FORMULA_LATEX' && (
                <input
                  value={q.formulaLatex || ''}
                  onChange={e => updateQ(q.id, { formulaLatex: e.target.value })}
                  placeholder="Optional LaTeX / KaTeX formula shown to the student"
                  className={`${inputCls} font-mono`}
                />
              )}

              {q.type === 'MCQ' ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-gray-500">Select the radio button next to the correct option.</p>
                  {(q.options || []).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct_${q.id}`}
                        checked={!!opt && q.correctAnswer === opt}
                        onChange={() => updateQ(q.id, { correctAnswer: opt })}
                        disabled={!opt.trim()}
                        className="accent-[#002561]"
                      />
                      <input
                        value={opt}
                        onChange={e => {
                          const next = [...(q.options || [])];
                          const wasCorrect = q.correctAnswer === opt;
                          next[oi] = e.target.value;
                          updateQ(q.id, { options: next, ...(wasCorrect ? { correctAnswer: e.target.value } : {}) });
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-600">Model answer (used by AI to evaluate student answers)</span>
                  <textarea
                    rows={3}
                    value={q.modelAnswer || ''}
                    onChange={e => updateQ(q.id, { modelAnswer: e.target.value })}
                    placeholder="Write the ideal answer with the key points students must cover..."
                    className={inputCls}
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-2"><span className="font-semibold text-gray-600">Marks</span>
                  <input type="number" min={1} value={q.marks} onChange={e => updateQ(q.id, { marks: Number(e.target.value) })} className="w-16 border border-gray-300 rounded-lg p-1.5 text-xs" /></label>
                <label className="flex items-center gap-2"><span className="font-semibold text-gray-600">Topic</span>
                  <input list="paper-topic-suggestions" value={q.topic || ''} onChange={e => updateQ(q.id, { topic: e.target.value })} placeholder="e.g. Trees" className="w-40 border border-gray-300 rounded-lg p-1.5 text-xs" /></label>
                <label className="flex items-center gap-2"><span className="font-semibold text-gray-600">Bloom level</span>
                  <select value={q.bloomLevel} onChange={e => updateQ(q.id, { bloomLevel: e.target.value as ExamQuestion['bloomLevel'] })} className="border border-gray-300 rounded-lg p-1.5 text-xs">
                    <option value="REMEMBER">Remember</option><option value="UNDERSTAND">Understand</option>
                    <option value="APPLY">Apply</option><option value="ANALYZE">Analyze</option>
                  </select></label>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setQuestions(p => [...p, blankMcq()])} className={ghostBtn}><Plus size={14} /> Add MCQ</button>
            <button onClick={() => setQuestions(p => [...p, blankDescriptive()])} className={ghostBtn}><Plus size={14} /> Add Descriptive Question</button>
            {subject && (
              <button onClick={() => runAi(false)} className="inline-flex items-center gap-1.5 border border-amber-400 bg-amber-50 text-amber-900 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-amber-100 transition">
                <Sparkles size={14} /> Add more questions with AI
              </button>
            )}
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5"><AlertTriangle size={13} /> Please fix the following before continuing:</p>
              <ul className="list-disc ml-5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100">
            <button onClick={handleSave} className={ghostBtn}><Save size={14} /> Save</button>
            <button onClick={handlePublishClick} className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-lg text-xs font-bold shadow transition">
              <Send size={14} /> Publish
            </button>
          </div>
        </div>
      )}

      {/* Publish → Print or Online */}
      {showPublish && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div>
              <h4 className="text-base font-bold text-cu-navy">How do you want to conduct this exam?</h4>
              <p className="text-xs text-gray-500">"{title}" — {questions.length} questions, {totalMarks} marks.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => finishPublish('PRINT')} className="p-4 rounded-xl border-2 border-gray-200 hover:border-cu-navy hover:bg-blue-50/40 text-left transition">
                <Printer size={20} className="text-cu-navy mb-2" />
                <p className="text-sm font-bold text-cu-navy">Print Question Paper</p>
                <p className="text-xs text-gray-500">Opens a print-ready paper for a written exam.</p>
              </button>
              <button onClick={() => finishPublish('ONLINE')} className="p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition">
                <MonitorPlay size={20} className="text-emerald-700 mb-2" />
                <p className="text-sm font-bold text-cu-navy">Online Exam</p>
                <p className="text-xs text-gray-500">Publishes to students with AI proctoring &amp; auto-evaluation.</p>
              </button>
            </div>
            <div className="text-right">
              <button onClick={() => setShowPublish(false)} className={ghostBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
