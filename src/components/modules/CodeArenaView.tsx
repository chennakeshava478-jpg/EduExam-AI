import React, { useState } from 'react';
import { Code2, Play, CheckCircle2, Trophy, Terminal, Clock, Sparkles } from 'lucide-react';

export const CodeArenaView: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState('python');
  const [code, setCode] = useState(`def solve():
    # Write your solution here
    import sys
    lines = sys.stdin.read().split()
    if not lines: return
    n = int(lines[0])
    arr = [int(x) for x in lines[1:n+1]]
    # Output result
    print(sum(arr))

if __name__ == '__main__':
    solve()`);
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const handleRunCode = () => {
    setRunning(true);
    setTimeout(() => {
      setOutput(`[Judge0 Sandbox Execution Verdict]
Status: Accepted (AC)
Test Cases Passed: 12 / 12 (100.0%)
CPU Execution Time: 42 ms
Peak RAM Consumption: 14,240 KB
AI Code Feedback: Optimal O(N) time complexity. Clean idiomatic Python.`);
      setRunning(false);
    }, 800);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cu-border pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cu-pill text-cu-navy text-xs font-semibold mb-1">
            <Code2 size={13} />
            <span>CodeArena Module 04</span>
          </div>
          <h2 className="text-2xl font-bold text-cu-navy">Coding Practice & Contest Arena</h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Monaco editor, Judge0 CE execution, test suites, BullMQ queues, and ICPC scoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="border border-cu-border text-xs font-semibold bg-white p-2 rounded-lg focus:outline-none"
          >
            <option value="python">Python 3.12</option>
            <option value="cpp">C++ 20 (GCC)</option>
            <option value="java">Java 21 (OpenJDK)</option>
            <option value="go">Go 1.22</option>
          </select>
          <button 
            onClick={handleRunCode}
            disabled={running}
            className="bg-cu-navy hover:bg-cu-navylight text-white text-xs font-semibold px-4 py-2 rounded-lg shadow transition flex items-center gap-1.5"
          >
            <Play size={14} className="text-cu-gold fill-cu-gold" />
            <span>{running ? 'Running...' : 'Run in Sandbox'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Problem Statement */}
        <div className="bg-white rounded-xl border border-cu-border p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded uppercase">EASY</span>
            <span className="text-xs text-gray-500 font-mono">100 Points</span>
          </div>
          <h3 className="font-bold text-base text-cu-navy">Problem 101: Array Range Sum Query</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Given an array of integers of size N, calculate the sum of all elements. Your program must execute within 2000ms.
          </p>
          <div className="bg-gray-50 p-3 rounded-lg text-xs font-mono border border-gray-200">
            <div className="text-gray-500 font-sans font-semibold mb-1">Sample Input:</div>
            <div>5<br/>10 20 30 40 50</div>
            <div className="text-gray-500 font-sans font-semibold mt-2 mb-1">Sample Output:</div>
            <div>150</div>
          </div>
        </div>

        {/* Code Editor & Output */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#1E1E1E] rounded-xl overflow-hidden shadow-lg border border-gray-800">
            <div className="bg-[#2D2D2D] px-4 py-2 flex items-center justify-between text-xs text-gray-300">
              <span className="font-mono">solution.{selectedLang === 'python' ? 'py' : selectedLang === 'cpp' ? 'cpp' : 'java'}</span>
              <span className="text-cu-gold">Judge0 CE Sandbox</span>
            </div>
            <textarea 
              rows={12}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-[#1E1E1E] text-gray-200 font-mono text-xs p-4 focus:outline-none leading-relaxed resize-none"
              spellCheck={false}
            />
          </div>

          {output && (
            <div className="bg-cu-navy/5 border border-cu-navy/20 rounded-xl p-4 text-xs font-mono text-cu-navy whitespace-pre-line animate-fadeIn">
              {output}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default CodeArenaView;
