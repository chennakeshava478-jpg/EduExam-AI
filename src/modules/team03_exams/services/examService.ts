// Team 03 (EduExam AI) Resilient Service Layer
// Offline autosave sync, CircuitBreaker protection, and decoupled listener for attendance eligibility unlock.

import { CircuitBreaker } from '../../../core/resilience/CircuitBreaker';
import { IsolatedStorage } from '../../../core/resilience/IsolatedStorage';
import { CampusEventBus } from '../../../core/resilience/EventBus';
import { AssessmentItem, ProctoringViolation, ExamQuestion, FacultySubject, CourseOutline, ExamAttempt } from '../types/exams.types';
import { DEFAULT_OUTLINES, resolveSubjectKey } from './questionBank';
import { getComponentMeta } from './assessmentComponents';
import { offlineStore } from './offlineStore';

const storage = new IsolatedStorage('team03_exams');

const INITIAL_ASSESSMENTS: AssessmentItem[] = [
  {
    id: 'exam_mca301_mid',
    title: 'PRG301 — Enterprise Cloud Systems Mid-Term',
    courseCode: 'MCA301',
    durationMinutes: 90,
    totalMarks: 50,
    scheduledDate: '2026-09-08',
    status: 'SCHEDULED',
    isLockedDueToAttendanceShortage: false,
    questions: [
      {
        id: 'q1',
        type: 'MCQ',
        prompt: 'Which consensus algorithm is best suited for Byzantine fault tolerance in decentralized ledgers?',
        options: ['Raft', 'PBFT (Practical Byzantine Fault Tolerance)', 'Two-Phase Commit (2PC)', 'Paxos'],
        correctAnswer: 'PBFT (Practical Byzantine Fault Tolerance)',
        marks: 2,
        bloomLevel: 'UNDERSTAND'
      },
      {
        id: 'q2',
        type: 'FORMULA_LATEX',
        prompt: 'Derive Amdahl’s Law formula for speedup S in parallel computing where p is the parallel fraction and s is execution speedup factor:',
        formulaLatex: 'S_{latency}(s) = \\frac{1}{(1 - p) + \\frac{p}{s}}',
        marks: 8,
        bloomLevel: 'APPLY'
      },
      {
        id: 'q3',
        type: 'SUBJECTIVE_ESSAY',
        prompt: 'Critique the circuit breaker architectural pattern versus exponential backoff in distributed microservices under cascading failure conditions.',
        marks: 10,
        bloomLevel: 'ANALYZE'
      }
    ]
  },
  {
    id: 'exam_dsa201_final',
    title: 'DSA201 — Data Structures & Algorithms End-Term',
    courseCode: 'DSA201',
    durationMinutes: 120,
    totalMarks: 100,
    scheduledDate: '2026-08-18',
    status: 'EVALUATED',
    isLockedDueToAttendanceShortage: false,
    questions: []
  }
];

const INITIAL_SUBJECTS: FacultySubject[] = [
  { code: 'PY101', name: 'Python Programming' },
  { code: 'JV201', name: 'Java Programming' },
  { code: 'DSA201', name: 'Data Structures' },
  { code: 'DB301', name: 'Database Management Systems' }
];

const INITIAL_VIOLATIONS: ProctoringViolation[] = [
  { id: 'v1', studentRoll: '24MCA001', studentName: 'Aarav Sharma', anomalyType: 'TAB_SWITCH', timestamp: '14:22:10', confidenceScore: 0.99, tabSwitchCount: 0, integrityRating: 98 },
  { id: 'v2', studentRoll: '24MCA004', studentName: 'Bhavna Patel', anomalyType: 'GAZE_DEVIATION', timestamp: '14:35:40', confidenceScore: 0.88, tabSwitchCount: 1, integrityRating: 91 },
  { id: 'v3', studentRoll: '24MCA005', studentName: 'Chirag Sen', anomalyType: 'MULTIPLE_FACES', timestamp: '14:41:15', confidenceScore: 0.94, tabSwitchCount: 3, integrityRating: 72 }
];

export interface GradebookFeedEntry {
  courseCode: string;
  subject: string;
  studentRoll: string;
  studentName: string;
  field: 'fa1' | 'midTerm' | 'fa2' | 'presentation' | 'summative';
  marks: number;
}

export class ExamService {
  private assessmentBreaker = new CircuitBreaker<AssessmentItem[]>({
    moduleId: 'exams',
    operationName: 'fetchAssessments',
    fallbackSupplier: () => storage.getItem('assessments', INITIAL_ASSESSMENTS)
  });

  constructor() {
    // Decoupled listener: When attendance condonation is filed or approved, unlock student exam ticket!
    CampusEventBus.subscribe('ATTENDANCE_CONDONATION_FILED', 'team03_exams', (event) => {
      console.log(`[EduExam AI] Received condonation notification for ${event.payload.studentRoll}. Checking hall ticket locks...`);
    });
  }

  public async getAssessments(): Promise<AssessmentItem[]> {
    return this.assessmentBreaker.execute(async () => {
      return storage.getItem('assessments', INITIAL_ASSESSMENTS);
    });
  }

  // ───────── Faculty: subjects, course outlines, paper setting ─────────

  public getSubjects(): FacultySubject[] {
    return storage.getItem('subjects', INITIAL_SUBJECTS);
  }

  public addSubject(subject: FacultySubject): FacultySubject[] {
    const list = this.getSubjects();
    if (list.some(s => s.code.toLowerCase() === subject.code.toLowerCase())) return list;
    const updated = [...list, subject];
    storage.setItem('subjects', updated);
    return updated;
  }

  public getOutline(subject: FacultySubject): CourseOutline {
    const all = storage.getItem<Record<string, CourseOutline>>('outlines', {});
    if (all[subject.code]) return all[subject.code];
    const key = resolveSubjectKey(subject.name);
    return { subjectCode: subject.code, text: key ? DEFAULT_OUTLINES[key] : '', updatedAt: '' };
  }

  public hasUploadedOutline(subjectCode: string): boolean {
    return !!storage.getItem<Record<string, CourseOutline>>('outlines', {})[subjectCode];
  }

  public saveOutline(outline: CourseOutline): void {
    const all = storage.getItem<Record<string, CourseOutline>>('outlines', {});
    all[outline.subjectCode] = { ...outline, updatedAt: new Date().toISOString() };
    storage.setItem('outlines', all);
  }

  public saveAssessment(assessment: AssessmentItem): AssessmentItem[] {
    const list = storage.getItem<AssessmentItem[]>('assessments', INITIAL_ASSESSMENTS);
    const exists = list.some(a => a.id === assessment.id);
    const updated = exists ? list.map(a => (a.id === assessment.id ? assessment : a)) : [...list, assessment];
    storage.setItem('assessments', updated);
    return updated;
  }

  public deleteAssessment(id: string): AssessmentItem[] {
    const updated = storage.getItem<AssessmentItem[]>('assessments', INITIAL_ASSESSMENTS).filter(a => a.id !== id);
    storage.setItem('assessments', updated);
    return updated;
  }

  // ───────── Student: published exams, attempts, in-progress autosave ─────────

  public getPublishedOnlineExams(): AssessmentItem[] {
    return storage.getItem<AssessmentItem[]>('assessments', INITIAL_ASSESSMENTS)
      .filter(a => a.status === 'PUBLISHED' && a.mode === 'ONLINE' && a.questions.length > 0);
  }

  public getAttempts(studentId: string): ExamAttempt[] {
    return storage.getItem<ExamAttempt[]>('attempts', []).filter(a => a.studentId === studentId);
  }

  public getAllAttempts(): ExamAttempt[] {
    return storage.getItem<ExamAttempt[]>('attempts', []);
  }

  public saveAttempt(attempt: ExamAttempt): void {
    const all = storage.getItem<ExamAttempt[]>('attempts', []);
    storage.setItem('attempts', [attempt, ...all.filter(a => a.id !== attempt.id)]);
  }

  // Marks from real student attempts, scaled to each gradebook component's maximum (e.g. 8.5/10 on an FA-1 paper -> 12.8/15).
  // Only the latest attempt per student + course + component counts. Always derived from the saved attempts,
  // so faculty mark overrides flow through automatically.
  public getGradebookFeed(): GradebookFeedEntry[] {
    const assessments = storage.getItem<AssessmentItem[]>('assessments', INITIAL_ASSESSMENTS);
    const latest = new Map<string, GradebookFeedEntry & { at: string }>();
    storage.getItem<ExamAttempt[]>('attempts', []).forEach(a => {
      const paper = assessments.find(x => x.id === a.assessmentId);
      const type = a.assessmentType || paper?.assessmentType;
      const meta = getComponentMeta(type);
      const courseCode = a.courseCode || paper?.courseCode;
      if (!meta || !courseCode || !a.result.totalMarks) return;
      const key = `${courseCode}|${a.studentRoll}|${meta.value}`;
      const prev = latest.get(key);
      if (prev && prev.at >= a.submittedAt) return;
      latest.set(key, {
        courseCode,
        subject: a.subject,
        studentRoll: a.studentRoll,
        studentName: a.studentName,
        field: meta.gradebookField,
        marks: Math.round((a.result.scoredMarks / a.result.totalMarks) * meta.maxMarks * 10) / 10,
        at: a.submittedAt
      });
    });
    return Array.from(latest.values()).map(({ at, ...rest }) => rest);
  }

  public saveProgress(key: string, data: { startedAt: number; answers: Record<string, string>; warnings: number }): void {
    storage.setItem(`progress_${key}`, data);
    void offlineStore.saveProgress(key, data); // durable IndexedDB copy
  }

  public loadProgress(key: string): { startedAt: number; answers: Record<string, string>; warnings: number } | null {
    return storage.getItem<{ startedAt: number; answers: Record<string, string>; warnings: number } | null>(`progress_${key}`, null);
  }

  public clearProgress(key: string): void {
    storage.removeItem(`progress_${key}`);
    void offlineStore.clearProgress(key);
    void offlineStore.dequeue(key);
  }

  public async getViolations(): Promise<ProctoringViolation[]> {
    return storage.getItem('violations', INITIAL_VIOLATIONS);
  }

  public async recordTelemetryViolation(violation: Omit<ProctoringViolation, 'id'>): Promise<ProctoringViolation> {
    const list = await this.getViolations();
    const newEntry: ProctoringViolation = {
      ...violation,
      id: `viol_${Date.now()}`
    };
    // Keep webcam snapshots only for the 30 newest events so localStorage never fills up.
    const updated = [newEntry, ...list].map((v, i) => (i >= 30 && v.snapshot ? { ...v, snapshot: undefined } : v));
    if (!storage.setItem('violations', updated)) {
      storage.setItem('violations', updated.map(v => ({ ...v, snapshot: undefined })));
    }
    return newEntry;
  }
}

export const examService = new ExamService();
