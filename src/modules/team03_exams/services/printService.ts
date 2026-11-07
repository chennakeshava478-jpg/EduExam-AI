// Team 03 (EduExam AI) — printable question paper generator (opens the browser print dialog).
import { AssessmentItem } from '../types/exams.types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const printQuestionPaper = (a: AssessmentItem, opts: { answerKey?: boolean } = {}): boolean => {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return false;

  const qs = a.questions.map((q, i) => {
    const opts4 = q.type === 'MCQ' && q.options
      ? `<ol type="A" class="opts">${q.options.map(o => `<li>${esc(o)}</li>`).join('')}</ol>` : '';
    const space = q.type === 'MCQ' ? '' : `<div class="lines">${'<div></div>'.repeat(q.marks >= 10 ? 10 : 5)}</div>`;
    const key = opts.answerKey
      ? `<div class="key"><b>Answer:</b> ${esc(String(q.type === 'MCQ' ? q.correctAnswer || '' : q.modelAnswer || ''))}</div>` : '';
    return `<div class="q"><div class="qh"><span><b>Q${i + 1}.</b> ${esc(q.prompt)}</span><span class="m">[${q.marks} Marks]</span></div>${opts4}${space}${key}</div>`;
  }).join('');

  w.document.write(`<!doctype html><html><head><title>${esc(a.title)}</title><style>
    body{font-family:'Times New Roman',serif;color:#000;margin:32px 40px;font-size:14px}
    h1{text-align:center;margin:0;font-size:20px;letter-spacing:.5px} h2{text-align:center;margin:4px 0 12px;font-size:15px;font-weight:normal}
    .meta{display:flex;justify-content:space-between;border-top:2px solid #000;border-bottom:2px solid #000;padding:6px 0;margin:10px 0 18px;font-weight:bold}
    .stu{display:flex;justify-content:space-between;margin-bottom:16px}
    .q{margin-bottom:16px;page-break-inside:avoid}.qh{display:flex;justify-content:space-between;gap:16px}.m{white-space:nowrap}
    .opts{margin:6px 0 0 24px;padding-left:12px}.opts li{margin:2px 0}
    .lines div{border-bottom:1px solid #999;height:24px}
    .key{margin-top:6px;padding:4px 8px;background:#eee;font-size:12px}
    @media print{body{margin:16mm}}
  </style></head><body>
    <h1>CHANAKYA UNIVERSITY</h1>
    <h2>${esc(a.subject || a.title)} — ${esc(a.title)}${opts.answerKey ? ' (ANSWER KEY)' : ''}</h2>
    <div class="meta"><span>Course: ${esc(a.courseCode)}</span><span>Duration: ${a.durationMinutes} Minutes</span><span>Max Marks: ${a.totalMarks}</span><span>Date: ${esc(a.scheduledDate)}</span></div>
    <div class="stu"><span>Name: ______________________________</span><span>Roll No: ________________</span></div>
    ${qs}
    <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
  </body></html>`);
  w.document.close();
  return true;
};
