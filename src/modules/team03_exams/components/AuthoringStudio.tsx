import React, { useState } from 'react';
import { BookOpen, Plus, CheckCircle2, Sliders, Layers, Upload, FileText, Pencil, Printer, Trash2, Sparkles, KeyRound } from 'lucide-react';
import { AssessmentItem, FacultySubject } from '../types/exams.types';
import { examService } from '../services/examService';
import { printQuestionPaper } from '../services/printService';
import { FacultyPaperWizard } from './FacultyPaperWizard';

interface AuthoringStudioProps {
  assessments: AssessmentItem[];
  onAssessmentsChanged?: (list: AssessmentItem[]) => void;
}

export const AuthoringStudio: React.FC<AuthoringStudioProps> = ({ assessments, onAssessmentsChanged }) => {
  const [subjects, setSubjects] = useState<FacultySubject[]>(() => examService.getSubjects());
  const [wizard, setWizard] = useState<{ subject?: FacultySubject; editing?: AssessmentItem } | null>(null);

  // Course-outline editor state
  const [outlineFor, setOutlineFor] = useState<FacultySubject | null>(null);
  const [outlineText, setOutlineText] = useState('');
  const [outlineFile, setOutlineFile] = useState<string | undefined>();
  const [outlineNote, setOutlineNote] = useState('');
  const [, force] = useState(0);

  // Add-subject form
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');

  const notify = (list: AssessmentItem[]) => onAssessmentsChanged?.(list);

  const openOutline = (s: FacultySubject) => {
    const o = examService.getOutline(s);
    setOutlineFor(s);
    setOutlineText(o.text);
    setOutlineFile(o.fileName);
    setOutlineNote('');
  };

  const handleOutlineFile = (file?: File) => {
    if (!file) return;
    setOutlineFile(file.name);
    if (/\.(txt|md|csv)$/i.test(file.name) || file.type.startsWith('text/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setOutlineText(String(reader.result || ''));
        setOutlineNote('Outline text loaded from the file. Review the topics and click Save Outline.');
      };
      reader.readAsText(file);
    } else {
      setOutlineNote('This file type cannot be read in the browser. The file name is attached — please paste or type the unit/topic list below so the AI can use it.');
    }
  };

  if (wizard) {
    return (
      <FacultyPaperWizard
        subjects={subjects}
        initialSubject={wizard.subject}
        editing={wizard.editing}
        onClose={() => setWizard(null)}
        onChanged={notify}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-base font-bold text-cu-navy flex items-center gap-2">
            <BookOpen size={18} />
            Assessment Authoring &amp; Examination Schedule
          </h3>
          <p className="text-xs text-gray-500">
            Author randomized question banks, Bloom taxonomy tags, and KaTeX math formulas.
          </p>
        </div>
        <button
          onClick={() => setWizard({})}
          className="inline-flex items-center gap-1.5 bg-[#002561] text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow hover:bg-[#0E1B38] transition"
        >
          <Plus size={14} />
          Create New Exam Paper
        </button>
      </div>

      {/* My subjects & course outlines */}
      <div className="bg-white rounded-xl border border-cu-border p-5 shadow-sm space-y-4">
        <div>
          <h4 className="text-sm font-bold text-cu-navy flex items-center gap-2"><Layers size={16} /> My Subjects &amp; Course Outlines</h4>
          <p className="text-xs text-gray-500">Upload the course outline for each subject you teach. The AI uses it when you prepare a question paper.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {subjects.map(s => {
            const uploaded = examService.hasUploadedOutline(s.code);
            return (
              <div key={s.code} className="rounded-xl border border-gray-200 p-3 space-y-2">
                <div>
                  <p className="text-sm font-bold text-cu-navy leading-tight">{s.name}</p>
                  <p className="text-[10px] font-mono text-gray-500">{s.code}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${uploaded ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                  <FileText size={10} /> {uploaded ? 'Outline uploaded' : 'Default outline'}
                </span>
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => openOutline(s)} className="inline-flex items-center justify-center gap-1.5 border border-gray-300 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50">
                    <Upload size={12} /> Upload / Edit Outline
                  </button>
                  <button onClick={() => setWizard({ subject: s })} className="inline-flex items-center justify-center gap-1.5 bg-[#002561] text-white rounded-lg px-2 py-1.5 text-[11px] font-semibold hover:bg-[#0E1B38]">
                    <Sparkles size={12} /> Prepare Question Paper
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {outlineFor && (
          <div className="rounded-xl border border-cu-navy/30 bg-blue-50/30 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-cu-navy">Course outline — {outlineFor.name}</p>
              <button onClick={() => setOutlineFor(null)} className="text-[11px] text-gray-500 hover:text-cu-navy">Close</button>
            </div>
            <input type="file" accept=".txt,.md,.csv,.pdf,.doc,.docx" onChange={e => handleOutlineFile(e.target.files?.[0])} className="block text-xs" />
            {outlineFile && <p className="text-[11px] text-gray-600">Attached: <b>{outlineFile}</b></p>}
            {outlineNote && <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">{outlineNote}</p>}
            <textarea
              rows={6}
              value={outlineText}
              onChange={e => setOutlineText(e.target.value)}
              placeholder={'One unit / topic per line, e.g.\nUnit 1: Data Types and Variables\nUnit 2: Control Flow and Functions'}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:border-cu-navy bg-white"
            />
            <button
              onClick={() => {
                examService.saveOutline({ subjectCode: outlineFor.code, fileName: outlineFile, text: outlineText, updatedAt: '' });
                setOutlineFor(null);
                force(n => n + 1);
              }}
              className="inline-flex items-center gap-1.5 bg-[#002561] text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-[#0E1B38]"
            >
              Save Outline
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-gray-100 text-xs">
          <label className="space-y-1"><span className="font-semibold text-gray-600 block">Add another subject</span>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Subject name" className="border border-gray-300 rounded-lg p-2 text-xs w-52" /></label>
          <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Code" className="border border-gray-300 rounded-lg p-2 text-xs w-24" />
          <button
            disabled={!newName.trim() || !newCode.trim()}
            onClick={() => { setSubjects(examService.addSubject({ code: newCode.trim().toUpperCase(), name: newName.trim() })); setNewName(''); setNewCode(''); }}
            className="inline-flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {assessments.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border border-cu-border p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-cu-saffron uppercase">
                {a.status === 'SCHEDULED' ? 'Upcoming Examination'
                  : a.status === 'DRAFT' ? 'Draft Question Paper'
                  : a.status === 'PUBLISHED' ? (a.mode === 'PRINT' ? 'Published — Print Paper' : 'Published — Online Exam')
                  : 'Past Assessment'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  a.status === 'SCHEDULED' || a.status === 'DRAFT'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {a.status}
              </span>
            </div>

            <h4 className="font-bold text-base text-cu-navy">{a.title}</h4>
            <p className="text-xs text-gray-600">
              Bloom taxonomy calibrated questions with randomized shuffler and anti-cheat web locks.
            </p>

            <div className="pt-2 text-xs text-gray-500 flex justify-between border-t border-gray-100">
              <span>Duration: {a.durationMinutes} Mins</span>
              <span>Total Marks: {a.totalMarks}</span>
              <span>Date: {a.scheduledDate}</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {a.status !== 'EVALUATED' && (
                <button onClick={() => setWizard({ editing: a })} className="inline-flex items-center gap-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50">
                  <Pencil size={11} /> Edit
                </button>
              )}
              {a.status !== 'EVALUATED' && (
                <>
                {a.questions.length > 0 && (
                  <>
                    <button onClick={() => printQuestionPaper(a)} className="inline-flex items-center gap-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50">
                      <Printer size={11} /> Print
                    </button>
                    <button onClick={() => printQuestionPaper(a, { answerKey: true })} className="inline-flex items-center gap-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50">
                      <KeyRound size={11} /> Answer Key
                    </button>
                  </>
                )}
                </>
              )}
              <button
                onClick={() => {
                  const extra = a.status === 'PUBLISHED' ? ' Students will no longer see it (their submitted results are kept).' : '';
                  if (confirm(`Delete "${a.title}"?${extra} This cannot be undone.`)) notify(examService.deleteAssessment(a.id));
                }}
                className="inline-flex items-center gap-1 border border-rose-200 text-rose-700 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold hover:bg-rose-50"
              >
                <Trash2 size={11} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
