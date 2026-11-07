import React, { useMemo } from 'react';
import { FileDown, Printer, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ProctoringViolation } from '../types/exams.types';

interface StudentSummary {
  roll: string;
  name: string;
  events: ProctoringViolation[];
  integrity: number;
  verdict: 'CLEAN' | 'REVIEW' | 'SUSPICIOUS';
  byType: Record<string, number>;
}

const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const summarise = (violations: ProctoringViolation[]): StudentSummary[] => {
  const map = new Map<string, ProctoringViolation[]>();
  violations.forEach(v => map.set(v.studentRoll, [...(map.get(v.studentRoll) || []), v]));
  return Array.from(map.entries()).map(([roll, list]) => {
    const events = [...list].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const integrity = Math.min(...events.map(e => e.integrityRating));
    const byType: Record<string, number> = {};
    events.forEach(e => { byType[e.anomalyType] = (byType[e.anomalyType] || 0) + 1; });
    return {
      roll, name: events[0].studentName, events, integrity, byType,
      verdict: integrity >= 90 ? 'CLEAN' : integrity >= 70 ? 'REVIEW' : 'SUSPICIOUS'
    } as StudentSummary;
  }).sort((a, b) => a.integrity - b.integrity);
};

const verdictCls = (v: StudentSummary['verdict']) =>
  v === 'CLEAN' ? 'bg-emerald-100 text-emerald-800' : v === 'REVIEW' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800';

const download = (name: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

export const IntegrityReport: React.FC<{ violations: ProctoringViolation[] }> = ({ violations }) => {
  const students = useMemo(() => summarise(violations), [violations]);

  const exportCsv = () => {
    const head = 'Roll,Name,Anomaly,Timestamp,AI Confidence %,Integrity Rating,Tab Switches,Final Verdict\n';
    const rows = students.flatMap(s => s.events.map(e =>
      `"${s.roll}","${s.name}","${e.anomalyType}","${e.timestamp}",${(e.confidenceScore * 100).toFixed(1)},${e.integrityRating},${e.tabSwitchCount},"${s.verdict}"`
    )).join('\n');
    download('ExamShield_Integrity_Audit.csv', head + rows, 'text/csv');
  };

  const printReport = () => {
    const w = window.open('', '_blank');
    if (!w) { alert('Pop-up blocked — allow pop-ups for this site to print the report.'); return; }
    const body = students.map(s => `
      <section>
        <h2>${esc(s.name)} <small>(${esc(s.roll)})</small> — Integrity ${s.integrity}/100 — ${s.verdict}</h2>
        <p>${Object.entries(s.byType).map(([k, n]) => `${esc(k)}: ${n}`).join(' · ')}</p>
        <table><tr><th>Time</th><th>Anomaly</th><th>Confidence</th><th>Rating</th><th>Evidence</th></tr>
        ${s.events.map(e => `<tr><td>${esc(e.timestamp)}</td><td>${esc(e.anomalyType)}</td><td>${(e.confidenceScore * 100).toFixed(1)}%</td><td>${e.integrityRating}</td>
          <td>${e.snapshot ? `<img src="${e.snapshot}" width="120" />` : '—'}</td></tr>`).join('')}
        </table>
      </section>`).join('');
    w.document.write(`<!doctype html><html><head><title>Integrity Audit Report</title><style>
      body{font-family:Arial,sans-serif;margin:16mm;color:#111} h1{color:#002561;font-size:20px} h2{font-size:14px;margin:18px 0 4px} small{color:#555}
      table{border-collapse:collapse;width:100%;font-size:11px} th,td{border:1px solid #ccc;padding:4px 6px;text-align:left} section{page-break-inside:avoid}
      @media print{body{margin:10mm}}</style></head><body>
      <h1>ExamShield — Integrity Audit Report</h1><p>Generated ${new Date().toLocaleString()}</p>${body || '<p>No flagged events.</p>'}
      <script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-cu-navy flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> Examiner Integrity Audit Report</h4>
          <p className="text-xs text-gray-500">Per-student timeline of flagged events with webcam evidence. Lowest integrity first.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"><FileDown size={13} /> Export CSV</button>
          <button onClick={printReport} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#002561] text-white rounded-lg text-xs font-bold hover:bg-[#0E1B38]"><Printer size={13} /> Print / Save PDF</button>
        </div>
      </div>

      {students.length === 0 ? (
        <p className="text-xs text-gray-500 py-4 text-center">No flagged events yet.</p>
      ) : students.map(s => (
        <div key={s.roll} className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-4 py-2.5 text-xs">
            <p className="font-bold text-gray-900">{s.name} <span className="font-mono text-gray-500">({s.roll})</span></p>
            <div className="flex items-center gap-2">
              {Object.entries(s.byType).map(([k, n]) => (
                <span key={k} className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[10px] font-semibold text-gray-600">{k} ×{n}</span>
              ))}
              <span className="font-bold text-cu-navy">Integrity {s.integrity}/100</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${verdictCls(s.verdict)}`}>
                {s.verdict !== 'CLEAN' && <ShieldAlert size={10} />}{s.verdict}
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {s.events.map(e => (
              <div key={e.id} className="flex items-center gap-4 px-4 py-2 text-xs">
                <span className="font-mono text-gray-500 w-16">{e.timestamp}</span>
                <span className="font-semibold text-gray-800 w-40">{e.anomalyType}</span>
                <span className="text-gray-600 w-16">{(e.confidenceScore * 100).toFixed(0)}%</span>
                <span className="text-gray-600 w-20">Rating {e.integrityRating}</span>
                {e.snapshot
                  ? <img src={e.snapshot} alt="Webcam evidence" className="h-14 rounded border border-gray-200" />
                  : <span className="text-gray-400">No snapshot</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
