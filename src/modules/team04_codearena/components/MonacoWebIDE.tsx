import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, CheckCircle2, Terminal, Sparkles, Clock, ShieldAlert, 
  BookOpen, Laptop, AlertCircle, Layers, Code2, Copy, 
  RotateCcw, Award, Check, Send, Database, FileCode
} from 'lucide-react';
import { CodeProblem, SupportedLanguage, TestCaseResult, CurriculumSubject } from '../types/codearena.types';
import { judgeService } from '../services/judgeService';
import { useAuth } from '../../../context/AuthContext';
import { unifiedAcademicService } from '../../../services/unifiedAcademicService';
import { InteractiveTerminal, TerminalLogEntry } from './InteractiveTerminal';
import { CodeExecutionService, InteractiveSession } from '../services/codeExecutionService';

interface MonacoWebIDEProps {
  initialSubjectCode?: string;
  onRunCode: (lang: SupportedLanguage, code: string, problemId: string) => Promise<TestCaseResult[]>;
}

// Boilerplate Starter Templates for all supported languages
const PLAYGROUND_BOILERPLATES: Record<SupportedLanguage, string> = {
  python: `# Chanakya University - Multi-Language Python 3.12 Sandbox
name = input("Enter your name: ")
print(f"Hello, {name}! Welcome to Chanakya University Coding Arena.")

num = int(input("Enter a number to calculate its square: "))
print(f"The square of {num} is: {num * num}")

print("Counting down:")
for i in range(num, 0, -1):
    print(f"T-minus {i}...")
print("Liftoff! Practice any Python logic freely here.")
`,
  java: `// Chanakya University - Java 21 LTS (OpenJDK 21)
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        System.out.println("=== Chanakya University Java 21 Runtime ===");
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextLine()) {
            String input = scanner.nextLine();
            System.out.println("Input Received: " + input);
        } else {
            System.out.println("Hello from Java 21 LTS Virtual Threads Sandbox!");
        }
    }
}
`,
  cpp: `// Chanakya University - C++ 20 (GCC 13.2 with POSIX threads)
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::cout << "=== Chanakya University C++ 20 Modern Compiler ===" << std::endl;
    std::string inputLine;
    if (std::getline(std::cin, inputLine) && !inputLine.empty()) {
        std::cout << "Read from stdin: " << inputLine << std::endl;
    } else {
        std::cout << "Hello from C++ 20 on gVisor Sandboxed Container!" << std::endl;
    }
    return 0;
}
`,
  c: `/* Chanakya University - C17 Standard (GCC 13.2) */
#include <stdio.h>
#include <stdlib.h>

int main() {
    printf("=== Chanakya University C17 Standard Runtime ===\\n");
    char buffer[256];
    if (fgets(buffer, sizeof(buffer), stdin) != NULL) {
        printf("Standard Input: %s\\n", buffer);
    } else {
        printf("Hello from C17 Systems Programming Environment!\\n");
    }
    return 0;
}
`,
  javascript: `// Chanakya University - Node.js 20 LTS (V8 Engine)
const readline = require('readline');

console.log("=== Chanakya University Node.js 20 Environment ===");
console.log("Hello from sandboxed JavaScript / V8 micro-container!");

// Demonstration logic
const numbers = [10, 25, 30, 45, 50];
const doubled = numbers.map(n => n * 2);
console.log("Processed Array:", doubled);
`,
  typescript: `// Chanakya University - TypeScript 5.4 Compiler
interface StudentProfile {
    usn: string;
    name: string;
    cgpa: number;
}

const student: StudentProfile = {
    usn: "1CU23CS001",
    name: "Aarav Sharma",
    cgpa: 9.4
};

console.log("=== Chanakya University TypeScript 5.4 Sandbox ===");
console.log(\`Student Profile: \${student.name} (\${student.usn}) - CGPA: \${student.cgpa}\`);
`,
  go: `// Chanakya University - Go 1.22 Runtime
package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    fmt.Println("=== Chanakya University Go 1.22 Concurrency Sandbox ===")
    scanner := bufio.NewScanner(os.Stdin)
    if scanner.Scan() {
        fmt.Printf("Stdin: %s\\n", scanner.Text())
    } else {
        fmt.Println("Hello from Go 1.22 goroutines engine!")
    }
}
`,
  rust: `// Chanakya University - Rust 1.76 Memory-Safe Sandbox
fn main() {
    println!("=== Chanakya University Rust 1.76 Safe Compiler ===");
    let greeting = String::from("Hello from Rust zero-cost abstractions!");
    println!("{}", greeting);
}
`,
  sql: `-- Chanakya University - PostgreSQL 16 / SQLite Engine
CREATE TABLE students (
    usn VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50),
    cgpa NUMERIC(3, 2),
    department VARCHAR(50)
);

INSERT INTO students VALUES 
    ('1CU23CS001', 'Aarav Sharma', 9.4, 'Computer Science'),
    ('1CU23CS002', 'Ananya Deshmukh', 9.8, 'Computer Science'),
    ('1CU23CS003', 'Arjun Kumar', 7.8, 'Computer Science');

SELECT usn, name, cgpa FROM students WHERE cgpa >= 8.5 ORDER BY cgpa DESC;
`
};

export const MonacoWebIDE: React.FC<MonacoWebIDEProps> = ({ initialSubjectCode = 'PRG301', onRunCode }) => {
  const { user } = useAuth();
  
  // High-Level IDE Mode: 'playground' (open compiler for any language) vs 'assignment' (instructor assigned lab problem)
  const [ideMode, setIdeMode] = useState<'playground' | 'assignment'>('playground');
  
  // Curriculum Subjects & Problems
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(initialSubjectCode);
  const [problems, setProblems] = useState<CodeProblem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<CodeProblem | null>(null);
  
  // Code & Language State
  const [lang, setLang] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>(PLAYGROUND_BOILERPLATES.python);
  const [customStdin, setCustomStdin] = useState<string>('42\nSample Test Data');
  
  // Execution & Output State
  const [running, setRunning] = useState(false);
  const [playgroundOutput, setPlaygroundOutput] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    timeMs: number;
    memoryMb: number;
  } | null>({
    stdout: '=== Chanakya University Cloud Sandbox Terminal ===\nReady for execution. Press "Run in Sandbox" (Ctrl+Enter) to compile.',
    stderr: '',
    exitCode: 0,
    timeMs: 14,
    memoryMb: 12.4
  });
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);

  // Real Interactive Terminal State
  const [terminalLogs, setTerminalLogs] = useState<TerminalLogEntry[]>([
    {
      id: 'init_1',
      type: 'system',
      text: '=== Chanakya University Interactive Cloud Sandbox (Linux x86_64) ===\n'
    },
    {
      id: 'init_2',
      type: 'system',
      text: 'Runtimes: Python 3.12, OpenJDK 21, GCC 13.2, Node.js 20\nType "run" or click Run in Sandbox to execute. Input requests prompt directly in this terminal!\n'
    }
  ]);
  const [isTerminalRunning, setIsTerminalRunning] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [inputPromptText, setInputPromptText] = useState('');
  const [executionMetrics, setExecutionMetrics] = useState<{ timeMs?: number; memoryMb?: number; exitCode?: number } | undefined>();
  const pendingInputResolverRef = useRef<((val: string) => void) | null>(null);
  const isCancelledRef = useRef(false);

  // Instructor Marks Toggle & Submission
  const [isCountedForMarks, setIsCountedForMarks] = useState<boolean>(true);
  const [awardedMarks, setAwardedMarks] = useState<number | null>(null);
  const [submissionReceipt, setSubmissionReceipt] = useState<string | null>(null);

  // Active Coding Time Tracking
  const [sessionSeconds, setSessionSeconds] = useState(185);
  const [isActiveTyping, setIsActiveTyping] = useState(false);
  const [lastKeystrokeTime, setLastKeystrokeTime] = useState<number>(Date.now());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Load subjects and problems
  useEffect(() => {
    judgeService.getSubjects().then(subjs => {
      setSubjects(subjs);
      const currentSubj = subjs.find(s => s.code === selectedSubjectCode) || subjs[0];
      if (currentSubj) {
        loadProblemsForSubject(currentSubj.id, currentSubj.primaryLanguage);
      }
    });
  }, []);

  const loadProblemsForSubject = async (subjectId: string, preferredLang: SupportedLanguage) => {
    const probs = await judgeService.getProblems(subjectId);
    setProblems(probs);
    if (probs.length > 0) {
      setSelectedProblem(probs[0]);
      if (ideMode === 'assignment') {
        setCode(probs[0].starterCodes[preferredLang] || probs[0].starterCodes.python || '');
      }
    }
  };

  const handleSubjectChange = (newCode: string) => {
    setSelectedSubjectCode(newCode);
    const targetSubj = subjects.find(s => s.code === newCode);
    if (targetSubj) {
      const targetLang = targetSubj.primaryLanguage;
      setLang(targetLang);
      loadProblemsForSubject(targetSubj.id, targetLang);
      setTestResults(null);
      setAwardedMarks(null);
      setSubmissionReceipt(null);
    }
  };

  const handleProblemChange = (probId: string) => {
    const prob = problems.find(p => p.id === probId);
    if (prob) {
      setSelectedProblem(prob);
      setCode(prob.starterCodes[lang] || '');
      setTestResults(null);
      setAwardedMarks(null);
      setSubmissionReceipt(null);
    }
  };

  const handleLangChange = (newLang: SupportedLanguage) => {
    setLang(newLang);
    if (ideMode === 'playground') {
      setCode(PLAYGROUND_BOILERPLATES[newLang]);
    } else if (selectedProblem) {
      setCode(selectedProblem.starterCodes[newLang] || PLAYGROUND_BOILERPLATES[newLang]);
    }
  };

  const handleResetBoilerplate = () => {
    if (ideMode === 'playground') {
      setCode(PLAYGROUND_BOILERPLATES[lang]);
    } else if (selectedProblem) {
      setCode(selectedProblem.starterCodes[lang] || PLAYGROUND_BOILERPLATES[lang]);
    }
    showToast('Code editor reset to official boilerplate template.');
  };

  // Switch between Playground and Assignment modes
  const handleSwitchMode = (mode: 'playground' | 'assignment') => {
    setIdeMode(mode);
    if (mode === 'playground') {
      setCode(PLAYGROUND_BOILERPLATES[lang]);
    } else if (selectedProblem) {
      setCode(selectedProblem.starterCodes[lang] || PLAYGROUND_BOILERPLATES[lang]);
    }
  };

  // Interactive Terminal Handlers & Streaming Session Ref
  const activeSessionRef = useRef<InteractiveSession | null>(null);

  const handleSendTerminalInput = (inputVal: string) => {
    setTerminalLogs(prev => [
      ...prev,
      { id: `in_${Date.now()}_${Math.random()}`, type: 'stdin', text: inputVal }
    ]);

    if (isTerminalRunning && activeSessionRef.current) {
      activeSessionRef.current.sendInput(inputVal);
      if (isWaitingForInput) {
        setIsWaitingForInput(false);
        setInputPromptText('');
      }
      if (pendingInputResolverRef.current) {
        const resolve = pendingInputResolverRef.current;
        pendingInputResolverRef.current = null;
        resolve(inputVal);
      }
    } else if (isWaitingForInput && pendingInputResolverRef.current) {
      setIsWaitingForInput(false);
      setInputPromptText('');
      const resolve = pendingInputResolverRef.current;
      pendingInputResolverRef.current = null;
      resolve(inputVal);
    } else if (!isTerminalRunning) {
      const trimmed = inputVal.trim();
      if (!trimmed) return;

      if (trimmed === 'clear') {
        setTerminalLogs([]);
      } else if (trimmed === 'run' || trimmed === 'python main.py' || trimmed === 'node main.js') {
        handleExecutePlayground();
      } else if (trimmed === 'help') {
        setTerminalLogs(prev => [
          ...prev,
          {
            id: `help_${Date.now()}`,
            type: 'system',
            text: 'Available Commands:\n  run                Execute code in editor\n  clear              Clear terminal display buffer\n  help               Display this help guide\n'
          }
        ]);
      } else {
        setTerminalLogs(prev => [
          ...prev,
          { id: `err_${Date.now()}`, type: 'stderr', text: `bash: ${trimmed}: command not found. Type 'run' or 'help'.\n` }
        ]);
      }
    }
  };

  const handleStopExecution = () => {
    isCancelledRef.current = true;
    if (activeSessionRef.current) {
      activeSessionRef.current.stop();
      activeSessionRef.current = null;
    }
    if (pendingInputResolverRef.current) {
      pendingInputResolverRef.current('');
      pendingInputResolverRef.current = null;
    }
    setIsWaitingForInput(false);
    setIsTerminalRunning(false);
    setRunning(false);
    setTerminalLogs(prev => [
      ...prev,
      { id: `stop_${Date.now()}`, type: 'stderr', text: '^C\n[Process terminated by user SIGINT]\n' }
    ]);
  };

  // Run in Open Playground / Terminal
  const handleExecutePlayground = async () => {
    if (activeSessionRef.current) {
      await activeSessionRef.current.stop();
      activeSessionRef.current = null;
    }

    setRunning(true);
    setIsTerminalRunning(true);
    isCancelledRef.current = false;

    const runCmd = lang === 'python' ? 'python3 -u main.py' : lang === 'javascript' ? 'node main.js' : lang === 'java' ? 'java Main.java' : `./main`;

    setTerminalLogs(prev => [
      ...prev,
      { id: `run_${Date.now()}`, type: 'prompt', text: `chanakya@sandbox:~$ ${runCmd}` }
    ]);

    const handleOutput = (chunk: string, isError: boolean = false) => {
      if (isCancelledRef.current) return;
      setTerminalLogs(prev => [
        ...prev,
        { id: `out_${Date.now()}_${Math.random()}`, type: isError ? 'stderr' : 'stdout', text: chunk }
      ]);
    };

    const handlePromptInput = async (promptMsg: string): Promise<string> => {
      if (isCancelledRef.current) return '';
      setIsWaitingForInput(true);
      setInputPromptText(promptMsg);
      return new Promise<string>((resolve) => {
        pendingInputResolverRef.current = resolve;
      });
    };

    const handleExit = (exitCode: number, timeMs: number) => {
      setRunning(false);
      setIsTerminalRunning(false);
      setIsWaitingForInput(false);
      activeSessionRef.current = null;
      setExecutionMetrics({ timeMs, exitCode });
      setTerminalLogs(prev => [
        ...prev,
        {
          id: `done_${Date.now()}`,
          type: 'system',
          text: `[Process completed with exit code ${exitCode} in ${timeMs}ms]\n`
        }
      ]);
    };

    try {
      const session = await CodeExecutionService.startInteractiveSession(
        lang,
        code,
        customStdin,
        handleOutput,
        handlePromptInput,
        handleExit
      );
      activeSessionRef.current = session;
    } catch (e: any) {
      handleOutput(`Execution Error: ${e.message || String(e)}\n`, true);
      handleExit(1, 0);
    }
  };

  // Run in Assignment / Test Suite Mode
  const handleExecuteAssignment = async () => {
    if (!selectedProblem) return;
    setRunning(true);
    setIsTerminalRunning(true);

    setTerminalLogs(prev => [
      ...prev,
      { id: `test_init_${Date.now()}`, type: 'prompt', text: `chanakya@sandbox:~$ ./cu_test_runner --problem=${selectedProblem.id} --lang=${lang}` },
      { id: `test_msg_${Date.now()}`, type: 'system', text: `[Ephemeral gVisor Container Sandboxed Runner]\nEvaluating code against test cases...\n` }
    ]);

    try {
      const results = await onRunCode(lang, code, selectedProblem.id);
      setTestResults(results);

      // Stream each test case verdict to terminal
      for (const r of results) {
        setTerminalLogs(prev => [
          ...prev,
          {
            id: `tc_stream_${r.id}_${Date.now()}`,
            type: r.passed ? 'stdout' : 'stderr',
            text: `  Case #${r.testCaseNumber} [${r.isHidden ? 'Hidden Evaluation' : 'Sample Case'}] -> ${r.verdict} (${r.executionTimeMs}ms)\n`
          }
        ]);
      }

      // Compute Marks if counted for marks
      const passedCount = results.filter(r => r.passed).length;
      const totalCases = results.length || 1;
      const allPassed = passedCount === totalCases;

      if (isCountedForMarks) {
        const marks = Math.round((passedCount / totalCases) * 10 * 10) / 10; // Max 10 marks
        setAwardedMarks(marks);
        setSubmissionReceipt(`CU-SUB-2026-${Math.floor(1000 + Math.random() * 9000)}`);
        setTerminalLogs(prev => [
          ...prev,
          {
            id: `tc_summary_${Date.now()}`,
            type: allPassed ? 'stdout' : 'stderr',
            text: `\n[VERDICT]: ${passedCount}/${totalCases} Test Cases Passed. Marks Awarded: ${marks} / 10\n`
          }
        ]);
      } else {
        setTerminalLogs(prev => [
          ...prev,
          {
            id: `tc_summary_${Date.now()}`,
            type: allPassed ? 'stdout' : 'stderr',
            text: `\n[VERDICT]: ${passedCount}/${totalCases} Test Cases Passed (Practice Mode).\n`
          }
        ]);
      }
    } finally {
      setRunning(false);
      setIsTerminalRunning(false);
    }
  };

  const handleSubmitToGradebook = () => {
    if (awardedMarks === null) return;
    
    unifiedAcademicService.recordLabSubmission({
      id: submissionReceipt || `CU-SUB-${Date.now()}`,
      usn: user?.employeeId || '1CU23CS001',
      studentName: user?.name || 'Aarav Sharma',
      courseCode: selectedSubjectCode === 'PRG301' ? 'CS301' : selectedSubjectCode,
      problemTitle: selectedProblem?.title || 'Lab Problem',
      awardedMarks: awardedMarks || 10,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    showToast(`Submission ${submissionReceipt} officially recorded! ${awardedMarks}/10 marks dispatched to FA-2 Continuous Lab Evaluation.`);
  };

  // Keystroke timer
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    setLastKeystrokeTime(Date.now());
  };

  // Active Coding Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const isTypingRecently = now - lastKeystrokeTime < 60000;
      setIsActiveTyping(isTypingRecently);

      setSessionSeconds(prev => {
        const next = prev + 1;
        if (next % 60 === 0 && isTypingRecently) {
          judgeService.logStudentCodingTime(
            user?.employeeId || '24MCA003',
            selectedSubjectCode,
            1
          );
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lastKeystrokeTime, selectedSubjectCode, user]);

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentSubject = subjects.find(s => s.code === selectedSubjectCode);

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-cu-navy text-white text-xs font-semibold shadow-2xl border border-cu-gold animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Navigation & Mode Switcher Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => handleSwitchMode('playground')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                ideMode === 'playground' ? 'bg-white text-cu-navy shadow-sm' : 'text-slate-600 hover:text-cu-navy'
              }`}
            >
              <Code2 size={14} className="text-amber-600" />
              <span>Free Practice Playground (Any Language)</span>
            </button>
            <button
              onClick={() => handleSwitchMode('assignment')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                ideMode === 'assignment' ? 'bg-white text-cu-navy shadow-sm' : 'text-slate-600 hover:text-cu-navy'
              }`}
            >
              <BookOpen size={14} className="text-sky-600" />
              <span>Instructor Assigned Tasks</span>
            </button>
          </div>
        </div>

        {/* Live Active Coding Timer */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Clock size={13} className={isActiveTyping ? 'text-emerald-600 animate-pulse' : 'text-slate-400'} />
            <div className="text-xs">
              <span className="text-slate-500 font-medium">Session: </span>
              <span className="font-mono font-bold text-slate-900">{formatTime(sessionSeconds)}</span>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isActiveTyping ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {isActiveTyping ? 'Active' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* Mode B Context Bar: Subject & Counted for Marks Banner (if in assignment mode) */}
      {ideMode === 'assignment' && (
        <div className="bg-white p-3.5 rounded-2xl border border-cu-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-cu-navy">
              <BookOpen size={14} className="text-cu-gold" />
              <span>Lab Subject:</span>
            </div>

            <select
              value={selectedSubjectCode}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="bg-gray-50 border border-cu-border text-xs font-bold text-cu-navy rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cu-gold"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.code}>
                  {s.code}: {s.name} ({s.primaryLanguage.toUpperCase()})
                </option>
              ))}
            </select>

            {currentSubject && (
              <span className="text-gray-500 font-medium hidden sm:inline">
                Faculty Lead: {currentSubject.facultyName}
              </span>
            )}
          </div>

          {/* Optional Marks Evaluation Toggle */}
          <div className="flex items-center gap-2.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            <Award size={14} className="text-amber-700" />
            <span className="font-bold text-amber-900">Count for Marks:</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isCountedForMarks}
                onChange={(e) => setIsCountedForMarks(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
            <span className="text-[11px] font-semibold text-amber-800">
              {isCountedForMarks ? 'Graded (10 Marks -> FA-2)' : 'Practice Only'}
            </span>
          </div>
        </div>
      )}

      {/* Main Coding Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Problem Details OR Playground Quick Help (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {ideMode === 'assignment' ? (
            /* Problem Assignment Statement Card */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Lab Assignment:</span>
                {selectedProblem && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    selectedProblem.difficulty === 'EASY' ? 'bg-emerald-100 text-emerald-800' :
                    selectedProblem.difficulty === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedProblem.difficulty}
                  </span>
                )}
              </div>

              {problems.length > 1 && (
                <select
                  value={selectedProblem?.id || ''}
                  onChange={(e) => handleProblemChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 rounded-xl p-2 focus:outline-none"
                >
                  {problems.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              )}

              {selectedProblem && (
                <>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{selectedProblem.title}</h3>
                    <span className="text-[11px] text-slate-500 font-mono">{selectedProblem.category} &bull; 10 Marks Rubric</span>
                  </div>

                  <div className="text-xs text-slate-600 leading-relaxed">
                    <p>{selectedProblem.statement}</p>
                  </div>

                  {/* Sample I/O */}
                  <div className="bg-slate-50 p-3 rounded-xl text-xs font-mono border border-slate-200 space-y-2">
                    <div>
                      <div className="text-slate-500 font-sans font-bold mb-0.5">Sample Input:</div>
                      <pre className="text-slate-800 bg-white p-2 rounded border border-slate-200 overflow-x-auto">{selectedProblem.sampleInput}</pre>
                    </div>
                    <div>
                      <div className="text-slate-500 font-sans font-bold mb-0.5">Sample Output:</div>
                      <pre className="text-slate-800 bg-white p-2 rounded border border-slate-200 overflow-x-auto">{selectedProblem.sampleOutput}</pre>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-400 space-y-0.5 border-t border-slate-100 font-mono">
                    <div>Timeout: {selectedProblem.timeLimitMs} ms &bull; Memory: {selectedProblem.memoryLimitMb} MB</div>
                    <div>Runtime: gVisor Container Kernel (runsc)</div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Open Playground Specs Card */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-sm text-cu-navy flex items-center gap-2">
                  <Laptop size={16} className="text-cu-gold" />
                  Independent Multi-Language Compiler
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                  Open Sandbox
                </span>
              </div>

              <div className="text-xs text-gray-600 space-y-2 leading-relaxed">
                <p>
                  Practice coding freely in any programming language without constraints. Support for command line arguments, custom standard input (stdin), and live terminal stdout.
                </p>
              </div>

              {/* Supported Environments list */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/60 space-y-2 text-xs">
                <span className="font-bold text-cu-navy block">Pre-Installed Compilers &amp; Runtimes:</span>
                <ul className="space-y-1 text-gray-600 text-[11px]">
                  <li>&bull; <strong>Python:</strong> v3.12 (NumPy, SciPy, Pandas)</li>
                  <li>&bull; <strong>Java:</strong> OpenJDK 21 LTS (Virtual Threads)</li>
                  <li>&bull; <strong>C++:</strong> GCC 13.2 (C++ 20 Standard)</li>
                  <li>&bull; <strong>C:</strong> GCC 13.2 (C17 Standard)</li>
                  <li>&bull; <strong>JavaScript &amp; TS:</strong> Node.js 20 LTS / TS 5.4</li>
                  <li>&bull; <strong>Go:</strong> Go 1.22 (Goroutines Engine)</li>
                  <li>&bull; <strong>Rust:</strong> Rust 1.76 (Cargo Safe Memory)</li>
                  <li>&bull; <strong>SQL:</strong> PostgreSQL 16.2 / SQLite 3</li>
                </ul>
              </div>

              {/* Custom Stdin Input Tab */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>Custom Stdin (Standard Input):</span>
                  <span className="text-[10px] font-normal text-gray-400">Passed to program</span>
                </label>
                <textarea
                  rows={3}
                  value={customStdin}
                  onChange={(e) => setCustomStdin(e.target.value)}
                  placeholder="Enter inputs here (e.g. numbers, strings)..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono focus:ring-1 focus:ring-cu-gold outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Code Editor & Terminal Output (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#182338] rounded-2xl overflow-hidden shadow-xl border border-slate-800">
            {/* Top Editor Bar */}
            <div className="bg-[#0e1726] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-amber-400" />
                <span className="font-mono text-amber-400 font-bold">
                  main.{lang === 'python' ? 'py' : lang === 'cpp' ? 'cpp' : lang === 'c' ? 'c' : lang === 'java' ? 'java' : lang === 'go' ? 'go' : lang === 'rust' ? 'rs' : lang === 'sql' ? 'sql' : lang === 'typescript' ? 'ts' : 'js'}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 text-[11px]">gVisor / runsc Container</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Language Picker */}
                <select
                  value={lang}
                  onChange={(e) => handleLangChange(e.target.value as SupportedLanguage)}
                  className="bg-[#182338] border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="python">Python 3.12</option>
                  <option value="java">Java 21 (OpenJDK)</option>
                  <option value="cpp">C++ 20 (GCC)</option>
                  <option value="c">C17 (GCC)</option>
                  <option value="javascript">JavaScript (Node.js 20)</option>
                  <option value="typescript">TypeScript 5.4</option>
                  <option value="go">Go 1.22</option>
                  <option value="rust">Rust 1.76</option>
                  <option value="sql">SQL (Postgres/SQLite)</option>
                </select>

                <button
                  onClick={handleResetBoilerplate}
                  title="Reset to language template"
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
                >
                  <RotateCcw size={13} />
                </button>

                {ideMode === 'assignment' ? (
                  <>
                    <button
                      onClick={handleExecutePlayground}
                      disabled={running}
                      title="Run and debug code interactively in terminal"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Terminal size={12} className="text-emerald-400" />
                      <span>{running ? 'Running...' : 'Run in Terminal'}</span>
                    </button>

                    <button
                      onClick={handleExecuteAssignment}
                      disabled={running}
                      title="Evaluate against all test cases"
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#0a1e3b] px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition disabled:opacity-50 cursor-pointer"
                    >
                      <Play size={12} className="fill-[#0a1e3b]" />
                      <span>{running ? 'Evaluating Suite...' : 'Submit & Run Tests'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleExecutePlayground}
                    disabled={running}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#0a1e3b] px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    <Play size={12} className="fill-[#0a1e3b]" />
                    <span>{running ? 'Running Process...' : 'Run in Terminal'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Code Editor Area */}
            <div className="p-3 bg-[#111a2e]">
              <textarea
                value={code}
                onChange={handleCodeChange}
                rows={16}
                spellCheck={false}
                className="w-full bg-transparent text-emerald-300 font-mono text-xs focus:outline-none resize-none leading-relaxed selection:bg-amber-400/30 selection:text-white"
                placeholder="Write your code here..."
              />
            </div>
          </div>

          {/* Real Interactive Cloud Terminal (with stdin prompt input and live output) */}
          <div className="space-y-2">
            <InteractiveTerminal
              logs={terminalLogs}
              isRunning={isTerminalRunning}
              isWaitingForInput={isWaitingForInput}
              inputPromptText={inputPromptText}
              onSendInput={handleSendTerminalInput}
              onRunCode={handleExecutePlayground}
              onStopCode={handleStopExecution}
              onClear={() => setTerminalLogs([])}
              activeLanguage={lang}
              executionMetrics={executionMetrics}
            />
          </div>

          {/* Test Case & Marks Verdict: Assignment Mode */}
          {ideMode === 'assignment' && testResults && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">
                    Test Evaluation Verdict:
                  </span>
                  {testResults.every(r => r.passed) ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      ACCEPTED (100% Passed)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-300">
                      <AlertCircle size={13} className="text-rose-600" />
                      PARTIAL / REJECTED
                    </span>
                  )}
                </div>

                {/* Marks Awarded */}
                {isCountedForMarks && awardedMarks !== null && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-cu-navy bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                      Awarded: {awardedMarks} / 10 Marks
                    </span>

                    <button
                      onClick={handleSubmitToGradebook}
                      className="px-3 py-1 rounded-xl bg-cu-navy text-white text-xs font-bold hover:bg-cu-navy-light transition shadow-xs flex items-center gap-1.5"
                    >
                      <Send size={12} /> Submit to Gradebook
                    </button>
                  </div>
                )}
              </div>

              {/* Individual Test Cases */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {testResults.map((tr) => (
                  <div 
                    key={tr.id}
                    className={`p-2.5 rounded-xl border font-mono ${
                      tr.passed 
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' 
                        : 'bg-rose-50/50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>Case #{tr.testCaseNumber}</span>
                      <span>{tr.passed ? 'PASS' : 'FAIL'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {tr.executionTimeMs}ms &bull; {Math.round(tr.memoryKb / 1024)}MB
                    </div>
                  </div>
                ))}
              </div>

              {submissionReceipt && (
                <div className="text-[11px] text-gray-500 font-mono text-right pt-1">
                  Submission Receipt: <span className="font-bold text-cu-navy">{submissionReceipt}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonacoWebIDE;
