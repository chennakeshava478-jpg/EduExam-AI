import React from 'react';
import { ShieldAlert, GitCompare, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PlagiarismComparison } from '../types/codearena.types';

interface PlagiarismAuditViewProps {
  audits: PlagiarismComparison[];
}

export const PlagiarismAuditView: React.FC<PlagiarismAuditViewProps> = ({ audits }) => {
  return (
    <div className="bg-white rounded-xl border border-cu-border p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div>
          <h3 className="text-base font-bold text-cu-navy flex items-center gap-2">
            <GitCompare size={18} className="text-cu-navy" />
            AST Tokenization &amp; Code Plagiarism Audit
          </h3>
          <p className="text-xs text-gray-500">
            Identifies copied control flow logic, subtree hashing, and variable obfuscation via Winnowing algorithms.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
          Python AST Engine Active
        </span>
      </div>

      <div className="space-y-4">
        {audits.map((item, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl border space-y-3 ${
              item.astSimilarityPercentage > 80
                ? 'bg-rose-50/50 border-rose-200'
                : 'bg-emerald-50/50 border-emerald-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span>{item.studentA}</span>
                <span className="text-gray-400">vs</span>
                <span>{item.studentB}</span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                    item.astSimilarityPercentage > 80
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {item.astSimilarityPercentage > 80 ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                  {item.astSimilarityPercentage}% AST Similarity
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {item.winnowingHashMatchCount} Hash Collisions
                </span>
              </div>
            </div>

            {item.flaggedLogicClones.length > 0 && (
              <div className="bg-white/80 p-3 rounded-lg border border-rose-200 text-xs space-y-1">
                <div className="font-semibold text-rose-800">Flagged Logic Structures:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-700">
                  {item.flaggedLogicClones.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
