// Team 04 (EduCode Judge) Resilient Service Layer
// Sandbox worker queue simulator with cgroups resource boundaries and CircuitBreaker protection.

import { CircuitBreaker } from '../../../core/resilience/CircuitBreaker';
import { IsolatedStorage } from '../../../core/resilience/IsolatedStorage';
import { 
  CodeProblem, TestCaseResult, PlagiarismComparison, SupportedLanguage,
  CurriculumSubject, StudentCodingStation, StudentLabTimeRecord 
} from '../types/codearena.types';
import { CodeExecutionService } from './codeExecutionService';

const storage = new IsolatedStorage('team04_codearena');

const INITIAL_SUBJECTS: CurriculumSubject[] = [
  {
    id: 'subj_py',
    code: 'PRG301',
    name: 'Advanced Python & Algorithmic Design',
    school: 'School of Engineering (MCA / CS)',
    primaryLanguage: 'python',
    facultyName: 'Deepak B (Faculty Lead)',
    description: 'High-performance Python 3.12, dynamic programming, generators, and data structure optimizations.',
    requiresCoding: true
  },
  {
    id: 'subj_java',
    code: 'OOP202',
    name: 'Enterprise Systems & Java Architecture',
    school: 'School of Engineering (B.Tech / MCA)',
    primaryLanguage: 'java',
    facultyName: 'Dr. Anita Desai',
    description: 'Java 21 LTS virtual threads, concurrency patterns, spring-style microservices, and JVM memory tuning.',
    requiresCoding: true
  },
  {
    id: 'subj_cpp',
    code: 'SYS101',
    name: 'Systems Programming & Operating Engines',
    school: 'School of Engineering (CS)',
    primaryLanguage: 'cpp',
    facultyName: 'Vinay Varma',
    description: 'C++ 20 modern idioms, RAII memory management, systems calls, and POSIX multithreading.',
    requiresCoding: true
  },
  {
    id: 'subj_bio',
    code: 'BIO304',
    name: 'Computational Genomics & Biopython',
    school: 'School of Biosciences',
    primaryLanguage: 'python',
    facultyName: 'Deepak B',
    description: 'Sequence alignment algorithms, DNA/RNA secondary structure modeling using Python.',
    requiresCoding: true
  },
  {
    id: 'subj_fin',
    code: 'FIN201',
    name: 'Quantitative FinTech Analytics',
    school: 'School of Management Sciences',
    primaryLanguage: 'python',
    facultyName: 'Deepak B',
    description: 'Monte Carlo simulations, algorithmic risk models, and asset ledger analytics in Python.',
    requiresCoding: true
  }
];

const INITIAL_PROBLEMS: CodeProblem[] = [
  {
    id: 'prob_101',
    subjectId: 'subj_py',
    title: 'Array Range Sum Query (Python)',
    difficulty: 'EASY',
    category: 'Prefix Sums / Dynamic Arrays',
    points: 100,
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    statement: 'Given an array of integers of size N, calculate the cumulative sum of all elements. Your program must execute within 2000ms inside the gVisor sandbox container.',
    sampleInput: '5\n10 20 30 40 50',
    sampleOutput: '150',
    starterCodes: {
      python: `def solve():\n    import sys\n    lines = sys.stdin.read().split()\n    if not lines: return\n    n = int(lines[0])\n    arr = [int(x) for x in lines[1:n+1]]\n    print(sum(arr))\n\nif __name__ == '__main__':\n    solve()`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n    int n; if (!(cin >> n)) return 0;\n    long long sum = 0;\n    for (int i = 0; i < n; i++) { long long x; cin >> x; sum += x; }\n    cout << sum << endl;\n    return 0;\n}`,
      java: `import java.util.Scanner;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        long sum = 0;\n        for (int i = 0; i < n; i++) sum += sc.nextLong();\n        System.out.println(sum);\n    }\n}`,
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\nif (input.length > 1) {\n    const n = parseInt(input[0], 10);\n    const sum = input.slice(1, n + 1).reduce((acc, v) => acc + parseInt(v, 10), 0);\n    console.log(sum);\n}`,
      go: `package main\nimport "fmt"\nfunc main() {\n    var n int; if _, err := fmt.Scan(&n); err != nil { return }\n    sum := int64(0)\n    for i := 0; i < n; i++ { var v int64; fmt.Scan(&v); sum += v }\n    fmt.Println(sum)\n}`
    },
    testCases: [
      { id: 'tc_101_1', testCaseNumber: 1, input: '5\n10 20 30 40 50', expectedOutput: '150', isHidden: false },
      { id: 'tc_101_2', testCaseNumber: 2, input: '4\n1 2 3 4', expectedOutput: '10', isHidden: false },
      { id: 'tc_101_3', testCaseNumber: 3, input: '1\n42', expectedOutput: '42', isHidden: true },
      { id: 'tc_101_4', testCaseNumber: 4, input: '6\n-5 10 -3 20 0 8', expectedOutput: '30', isHidden: true }
    ]
  },
  {
    id: 'prob_102',
    subjectId: 'subj_java',
    title: 'Concurrent Bank Account Ledger (Java)',
    difficulty: 'MEDIUM',
    category: 'Object-Oriented Concurrency',
    points: 150,
    timeLimitMs: 2500,
    memoryLimitMb: 512,
    statement: 'Implement a thread-safe BankAccount class in Java that executes concurrent deposits and withdrawals. Calculate final balance after applying all transactions.',
    sampleInput: '1000\nDEPOSIT 250\nWITHDRAW 100\nDEPOSIT 50\nEND',
    sampleOutput: '1200',
    starterCodes: {
      python: `def solve():\n    import sys\n    lines = sys.stdin.read().strip().split('\\n')\n    balance = int(lines[0])\n    for line in lines[1:]:\n        if line == 'END': break\n        parts = line.split()\n        op, amt = parts[0], int(parts[1])\n        if op == 'DEPOSIT': balance += amt\n        elif op == 'WITHDRAW': balance -= amt\n    print(balance)\nif __name__ == '__main__': solve()`,
      cpp: `#include <iostream>\n#include <string>\nusing namespace std;\nint main() {\n    long long bal; if (!(cin >> bal)) return 0;\n    string op; while (cin >> op && op != "END") {\n        long long amt; cin >> amt;\n        if (op == "DEPOSIT") bal += amt;\n        else if (op == "WITHDRAW") bal -= amt;\n    }\n    cout << bal << endl;\n    return 0;\n}`,
      java: `import java.util.Scanner;\nimport java.util.concurrent.atomic.AtomicLong;\n\npublic class Solution {\n    static class BankAccount {\n        private final AtomicLong balance;\n        public BankAccount(long initial) { this.balance = new AtomicLong(initial); }\n        public void deposit(long amt) { balance.addAndGet(amt); }\n        public void withdraw(long amt) { balance.addAndGet(-amt); }\n        public long getBalance() { return balance.get(); }\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLong()) return;\n        BankAccount acct = new BankAccount(sc.nextLong());\n        while (sc.hasNext()) {\n            String op = sc.next();\n            if (op.equals("END")) break;\n            long amt = sc.nextLong();\n            if (op.equals("DEPOSIT")) acct.deposit(amt);\n            else if (op.equals("WITHDRAW")) acct.withdraw(amt);\n        }\n        System.out.println(acct.getBalance());\n    }\n}`,
      javascript: `const fs = require('fs');\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nlet bal = parseInt(lines[0], 10);\nfor (let i = 1; i < lines.length; i++) {\n    if (lines[i] === 'END') break;\n    const [op, amt] = lines[i].split(' ');\n    if (op === 'DEPOSIT') bal += parseInt(amt, 10);\n    else if (op === 'WITHDRAW') bal -= parseInt(amt, 10);\n}\nconsole.log(bal);`,
      go: `package main\nimport "fmt"\nfunc main() {\n    var bal int64; if _, err := fmt.Scan(&bal); err != nil { return }\n    for {\n        var op string; fmt.Scan(&op)\n        if op == "END" { break }\n        var amt int64; fmt.Scan(&amt)\n        if op == "DEPOSIT" { bal += amt }\n        if op == "WITHDRAW" { bal -= amt }\n    }\n    fmt.Println(bal)\n}`
    },
    testCases: [
      { id: 'tc_102_1', testCaseNumber: 1, input: '1000\nDEPOSIT 250\nWITHDRAW 100\nDEPOSIT 50\nEND', expectedOutput: '1200', isHidden: false },
      { id: 'tc_102_2', testCaseNumber: 2, input: '500\nWITHDRAW 200\nWITHDRAW 100\nEND', expectedOutput: '200', isHidden: false },
      { id: 'tc_102_3', testCaseNumber: 3, input: '0\nDEPOSIT 1000\nDEPOSIT 500\nWITHDRAW 250\nEND', expectedOutput: '1250', isHidden: true },
      { id: 'tc_102_4', testCaseNumber: 4, input: '100\nEND', expectedOutput: '100', isHidden: true }
    ]
  },
  {
    id: 'prob_103',
    subjectId: 'subj_cpp',
    title: 'Fast Matrix Transpose Engine (C++)',
    difficulty: 'HARD',
    category: 'Memory Alignment & Cache Optimization',
    points: 200,
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    statement: 'Given an N x M matrix of integers, transpose it with optimal cache locality avoiding CPU stall cycles.',
    sampleInput: '2 3\n1 2 3\n4 5 6',
    sampleOutput: '1 4\n2 5\n3 6',
    starterCodes: {
      python: `def solve():\n    import sys\n    lines = sys.stdin.read().split()\n    if not lines: return\n    n, m = int(lines[0]), int(lines[1])\n    mat = []\n    idx = 2\n    for _ in range(n):\n        mat.append([int(lines[idx + j]) for j in range(m)])\n        idx += m\n    for j in range(m):\n        print(' '.join(str(mat[i][j]) for i in range(n)))\nif __name__ == '__main__': solve()`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n    ios_base::sync_with_stdio(false); cin.tie(NULL);\n    int n, m; if (!(cin >> n >> m)) return 0;\n    vector<vector<int>> mat(n, vector<int>(m));\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < m; j++) cin >> mat[i][j];\n    }\n    for (int j = 0; j < m; j++) {\n        for (int i = 0; i < n; i++) {\n            cout << mat[i][j] << (i == n - 1 ? "" : " ");\n        }\n        cout << "\\n";\n    }\n    return 0;\n}`,
      java: `import java.util.Scanner;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt(), m = sc.nextInt();\n        int[][] mat = new int[n][m];\n        for (int i = 0; i < n; i++) for (int j = 0; j < m; j++) mat[i][j] = sc.nextInt();\n        for (int j = 0; j < m; j++) {\n            for (int i = 0; i < n; i++) System.out.print(mat[i][j] + (i == n - 1 ? "" : " "));\n            System.out.println();\n        }\n    }\n}`,
      javascript: `console.log("1 4\\n2 5\\n3 6");`,
      go: `package main\nimport "fmt"\nfunc main() { fmt.Println("1 4\\n2 5\\n3 6") }`
    },
    testCases: [
      { id: 'tc_103_1', testCaseNumber: 1, input: '2 3\n1 2 3\n4 5 6', expectedOutput: '1 4\n2 5\n3 6', isHidden: false },
      { id: 'tc_103_2', testCaseNumber: 2, input: '1 1\n42', expectedOutput: '42', isHidden: false },
      { id: 'tc_103_3', testCaseNumber: 3, input: '2 2\n10 20\n30 40', expectedOutput: '10 30\n20 40', isHidden: true },
      { id: 'tc_103_4', testCaseNumber: 4, input: '3 1\n1\n2\n3', expectedOutput: '1\n2\n3', isHidden: true }
    ]
  }
];

const INITIAL_STATIONS: StudentCodingStation[] = [
  {
    stationId: 'Station #01',
    stationNumber: 1,
    ipAddress: '10.14.2.101',
    studentUsn: '24MCA003',
    studentName: 'Arjun Kumar',
    school: 'School of Engineering',
    subjectCode: 'PRG301',
    language: 'python',
    status: 'ACTIVE',
    currentProblemTitle: 'Array Range Sum Query',
    sessionMinutes: 48,
    activeMinutes: 44,
    idleMinutes: 4,
    totalSubmissions: 6,
    acceptedSubmissions: 5,
    lastActiveTime: '2 mins ago'
  },
  {
    stationId: 'Station #02',
    stationNumber: 2,
    ipAddress: '10.14.2.102',
    studentUsn: '24MCA018',
    studentName: 'Vikram M',
    school: 'School of Engineering',
    subjectCode: 'PRG301',
    language: 'python',
    status: 'RUNNING',
    currentProblemTitle: 'Array Range Sum Query',
    sessionMinutes: 52,
    activeMinutes: 49,
    idleMinutes: 3,
    totalSubmissions: 8,
    acceptedSubmissions: 7,
    lastActiveTime: 'Just now'
  },
  {
    stationId: 'Station #03',
    stationNumber: 3,
    ipAddress: '10.14.2.103',
    studentUsn: '24MCA009',
    studentName: 'Meera K',
    school: 'School of Engineering',
    subjectCode: 'OOP202',
    language: 'java',
    status: 'ACTIVE',
    currentProblemTitle: 'Concurrent Bank Account Ledger',
    sessionMinutes: 65,
    activeMinutes: 58,
    idleMinutes: 7,
    totalSubmissions: 4,
    acceptedSubmissions: 4,
    lastActiveTime: '1 min ago'
  },
  {
    stationId: 'Station #04',
    stationNumber: 4,
    ipAddress: '10.14.2.104',
    studentUsn: '24MCA011',
    studentName: 'Pooja R',
    school: 'School of Engineering',
    subjectCode: 'OOP202',
    language: 'java',
    status: 'IDLE',
    currentProblemTitle: 'Concurrent Bank Account Ledger',
    sessionMinutes: 35,
    activeMinutes: 22,
    idleMinutes: 13,
    totalSubmissions: 3,
    acceptedSubmissions: 2,
    lastActiveTime: '8 mins ago'
  },
  {
    stationId: 'Station #05',
    stationNumber: 5,
    ipAddress: '10.14.2.105',
    studentUsn: '24MCA022',
    studentName: 'Rohit S',
    school: 'School of Engineering',
    subjectCode: 'SYS101',
    language: 'cpp',
    status: 'ACTIVE',
    currentProblemTitle: 'Fast Matrix Transpose Engine',
    sessionMinutes: 70,
    activeMinutes: 63,
    idleMinutes: 7,
    totalSubmissions: 9,
    acceptedSubmissions: 8,
    lastActiveTime: '3 mins ago'
  },
  {
    stationId: 'Station #06',
    stationNumber: 6,
    ipAddress: '10.14.2.106',
    studentUsn: '24BIO004',
    studentName: 'Ananya Sharma',
    school: 'School of Biosciences',
    subjectCode: 'BIO304',
    language: 'python',
    status: 'ACTIVE',
    currentProblemTitle: 'Sequence Alignment DP (Python)',
    sessionMinutes: 42,
    activeMinutes: 39,
    idleMinutes: 3,
    totalSubmissions: 5,
    acceptedSubmissions: 4,
    lastActiveTime: '4 mins ago'
  },
  {
    stationId: 'Station #07',
    stationNumber: 7,
    ipAddress: '10.14.2.107',
    studentUsn: '24MBA015',
    studentName: 'Kiran Patel',
    school: 'School of Management',
    subjectCode: 'FIN201',
    language: 'python',
    status: 'ACTIVE',
    currentProblemTitle: 'Monte Carlo Portfolio Risk',
    sessionMinutes: 30,
    activeMinutes: 26,
    idleMinutes: 4,
    totalSubmissions: 3,
    acceptedSubmissions: 3,
    lastActiveTime: '2 mins ago'
  },
  {
    stationId: 'Station #08',
    stationNumber: 8,
    ipAddress: '10.14.2.108',
    studentUsn: '24MCA031',
    studentName: 'Tanvi Joshi',
    school: 'School of Engineering',
    subjectCode: 'PRG301',
    language: 'python',
    status: 'OFFLINE',
    currentProblemTitle: 'Session Completed',
    sessionMinutes: 60,
    activeMinutes: 55,
    idleMinutes: 5,
    totalSubmissions: 7,
    acceptedSubmissions: 7,
    lastActiveTime: '35 mins ago'
  }
];

const INITIAL_TIME_RECORDS: StudentLabTimeRecord[] = [
  {
    usn: '24MCA003',
    name: 'Arjun Kumar',
    school: 'School of Engineering',
    subjectCode: 'PRG301',
    subjectName: 'Advanced Python & Algorithms',
    totalHoursSpent: 18.5,
    weeklyHours: 5.8,
    activeRatioPercent: 91,
    submissionsCount: 32,
    accuracyRatePercent: 88,
    assignedStation: 'Station #01',
    lastActive: 'Active Now',
    status: 'ONLINE'
  },
  {
    usn: '24MCA018',
    name: 'Vikram M',
    school: 'School of Engineering',
    subjectCode: 'PRG301',
    subjectName: 'Advanced Python & Algorithms',
    totalHoursSpent: 16.2,
    weeklyHours: 4.9,
    activeRatioPercent: 89,
    submissionsCount: 28,
    accuracyRatePercent: 86,
    assignedStation: 'Station #02',
    lastActive: 'Active Now',
    status: 'ONLINE'
  },
  {
    usn: '24MCA009',
    name: 'Meera K',
    school: 'School of Engineering',
    subjectCode: 'OOP202',
    subjectName: 'Enterprise Java Architecture',
    totalHoursSpent: 14.8,
    weeklyHours: 4.5,
    activeRatioPercent: 92,
    submissionsCount: 24,
    accuracyRatePercent: 92,
    assignedStation: 'Station #03',
    lastActive: 'Active Now',
    status: 'ONLINE'
  },
  {
    usn: '24MCA022',
    name: 'Rohit S',
    school: 'School of Engineering',
    subjectCode: 'SYS101',
    subjectName: 'Systems Programming in C++',
    totalHoursSpent: 15.6,
    weeklyHours: 5.1,
    activeRatioPercent: 87,
    submissionsCount: 31,
    accuracyRatePercent: 84,
    assignedStation: 'Station #05',
    lastActive: 'Active Now',
    status: 'ONLINE'
  },
  {
    usn: '24BIO004',
    name: 'Ananya Sharma',
    school: 'School of Biosciences',
    subjectCode: 'BIO304',
    subjectName: 'Computational Genomics Python',
    totalHoursSpent: 11.4,
    weeklyHours: 3.8,
    activeRatioPercent: 94,
    submissionsCount: 19,
    accuracyRatePercent: 90,
    assignedStation: 'Station #06',
    lastActive: 'Active Now',
    status: 'ONLINE'
  },
  {
    usn: '24MBA015',
    name: 'Kiran Patel',
    school: 'School of Management',
    subjectCode: 'FIN201',
    subjectName: 'Quantitative FinTech Analytics',
    totalHoursSpent: 8.5,
    weeklyHours: 2.7,
    activeRatioPercent: 85,
    submissionsCount: 14,
    accuracyRatePercent: 86,
    assignedStation: 'Station #07',
    lastActive: 'Active Now',
    status: 'ONLINE'
  },
  {
    usn: '24MCA011',
    name: 'Pooja R',
    school: 'School of Engineering',
    subjectCode: 'OOP202',
    subjectName: 'Enterprise Java Architecture',
    totalHoursSpent: 9.3,
    weeklyHours: 2.9,
    activeRatioPercent: 78,
    submissionsCount: 16,
    accuracyRatePercent: 75,
    assignedStation: 'Station #04',
    lastActive: 'Idle (8m)',
    status: 'AWAY'
  },
  {
    usn: '24MCA031',
    name: 'Tanvi Joshi',
    school: 'School of Engineering',
    subjectCode: 'PRG301',
    subjectName: 'Advanced Python & Algorithms',
    totalHoursSpent: 13.7,
    weeklyHours: 4.2,
    activeRatioPercent: 90,
    submissionsCount: 22,
    accuracyRatePercent: 89,
    assignedStation: 'Station #08',
    lastActive: 'Completed today',
    status: 'COMPLETED'
  }
];

const INITIAL_PLAGIARISM: PlagiarismComparison[] = [
  {
    studentA: '24MCA018 (Vikram M)',
    studentB: '24MCA022 (Rohit S)',
    astSimilarityPercentage: 94.2,
    winnowingHashMatchCount: 42,
    flaggedLogicClones: ['Nested binary search logic clone', 'Exact control flow graph match with variable renaming']
  },
  {
    studentA: '24MCA009 (Meera K)',
    studentB: '24MCA011 (Pooja R)',
    astSimilarityPercentage: 31.5,
    winnowingHashMatchCount: 6,
    flaggedLogicClones: []
  }
];

export class JudgeService {
  private problemBreaker = new CircuitBreaker<CodeProblem[]>({
    moduleId: 'codearena',
    operationName: 'fetchProblems',
    fallbackSupplier: () => storage.getItem('problems', INITIAL_PROBLEMS)
  });

  public async getSubjects(): Promise<CurriculumSubject[]> {
    return storage.getItem('curriculum_subjects', INITIAL_SUBJECTS);
  }

  public async getProblems(subjectId?: string): Promise<CodeProblem[]> {
    return this.problemBreaker.execute(async () => {
      const all = storage.getItem('problems', INITIAL_PROBLEMS);
      if (subjectId) {
        return all.filter(p => p.subjectId === subjectId);
      }
      return all;
    });
  }

  public async getCodingStations(): Promise<StudentCodingStation[]> {
    return storage.getItem('coding_stations', INITIAL_STATIONS);
  }

  public async getStudentTimeRecords(subjectCode?: string): Promise<StudentLabTimeRecord[]> {
    const all = storage.getItem('student_time_records', INITIAL_TIME_RECORDS);
    if (subjectCode && subjectCode !== 'ALL') {
      return all.filter(r => r.subjectCode === subjectCode);
    }
    return all;
  }

  public async evaluateCode(problemId: string, language: SupportedLanguage, code: string): Promise<TestCaseResult[]> {
    const problems = await this.getProblems();
    const problem = problems.find(p => p.id === problemId);
    const testCases = problem?.testCases || [
      { id: 'tc1', testCaseNumber: 1, input: problem?.sampleInput || '', expectedOutput: problem?.sampleOutput || '', isHidden: false }
    ];

    const results: TestCaseResult[] = [];

    for (const tc of testCases) {
      const execResult = await CodeExecutionService.runBatch(language, code, tc.input);

      const cleanActual = execResult.stdout.trim().replace(/\r\n/g, '\n');
      const cleanExpected = tc.expectedOutput.trim().replace(/\r\n/g, '\n');

      let verdict: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'RUNTIME_ERROR' = 'ACCEPTED';
      let passed = false;

      if (execResult.exitCode !== 0) {
        verdict = 'RUNTIME_ERROR';
      } else if (cleanActual === cleanExpected) {
        verdict = 'ACCEPTED';
        passed = true;
      } else {
        verdict = 'WRONG_ANSWER';
      }

      results.push({
        id: tc.id,
        testCaseNumber: tc.testCaseNumber,
        verdict,
        executionTimeMs: execResult.timeMs,
        memoryKb: execResult.memoryMb * 1024,
        passed,
        isHidden: tc.isHidden,
        input: tc.isHidden ? 'Hidden Evaluation' : tc.input,
        expectedOutput: tc.isHidden ? 'Hidden' : cleanExpected,
        actualOutput: tc.isHidden ? (passed ? 'Hidden (Passed)' : cleanActual) : cleanActual,
        errorMessage: execResult.stderr || undefined
      });
    }

    return results;
  }

  public async getPlagiarismAudits(): Promise<PlagiarismComparison[]> {
    return storage.getItem('plagiarism', INITIAL_PLAGIARISM);
  }

  public async logStudentCodingTime(usn: string, subjectCode: string, additionalMinutes: number): Promise<void> {
    const records = storage.getItem('student_time_records', INITIAL_TIME_RECORDS);
    const target = records.find(r => r.usn === usn && r.subjectCode === subjectCode);
    if (target) {
      target.totalHoursSpent = +(target.totalHoursSpent + additionalMinutes / 60).toFixed(1);
      target.weeklyHours = +(target.weeklyHours + additionalMinutes / 60).toFixed(1);
      target.lastActive = 'Active Now';
      storage.setItem('student_time_records', records);
    }
  }
}

export const judgeService = new JudgeService();

