// Team 03 (EduExam AI) Domain Types
// Aligned with PostgreSQL 16 schema: exam_assessments, exam_questions, exam_submissions, exam_proctoring_logs

export type QuestionType = 'MCQ' | 'MULTI_SELECT' | 'FORMULA_LATEX' | 'SUBJECTIVE_ESSAY';
// Which 60:40 NEP gradebook component a paper feeds into.
export type AssessmentComponent = 'FA1' | 'MIDTERM' | 'FA2' | 'PRESENTATION' | 'SEE';
export type ProctoringAnomalyType = 'MISSING_FACE' | 'MULTIPLE_FACES' | 'GAZE_DEVIATION' | 'TAB_SWITCH' | 'BACKGROUND_SPEECH';

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  formulaLatex?: string;
  options?: string[];
  correctAnswer?: string | string[];
  marks: number;
  bloomLevel: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE';
  // --- Added for faculty paper setting + AI evaluation ---
  topic?: string;
  modelAnswer?: string;      // used by the AI evaluator for descriptive answers
  aiGenerated?: boolean;     // true when created by the AI question generator
}

export interface AssessmentItem {
  id: string;
  title: string;
  courseCode: string;
  durationMinutes: number;
  totalMarks: number;
  scheduledDate: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'EVALUATED' | 'DRAFT' | 'PUBLISHED';
  questions: ExamQuestion[];
  isLockedDueToAttendanceShortage: boolean;
  // --- Added for faculty paper setting ---
  subject?: string;          // e.g. "Python Programming"
  mode?: 'ONLINE' | 'PRINT'; // chosen at publish time
  createdBy?: string;
  publishedAt?: string;
  assessmentType?: AssessmentComponent; // FA-1 / Mid-Term / FA-2 / Presentation / Semester End Exam
  startTime?: string;        // "HH:MM" — exam window opens (on scheduledDate)
  endTime?: string;          // "HH:MM" — exam window closes
  shuffleQuestions?: boolean; // per-student question + option order (default on)
}

export interface FacultySubject {
  code: string;
  name: string;
}

export interface CourseOutline {
  subjectCode: string;
  fileName?: string;
  text: string;              // topics / units, one per line
  updatedAt: string;
}

export interface AttemptQuestionResult {
  questionId: string;
  prompt: string;
  type: QuestionType;
  topic: string;
  studentAnswer: string;
  correctAnswer: string;
  maxMarks: number;
  awardedMarks: number;
  isCorrect: boolean;        // fully correct
  pending?: boolean;         // no model answer configured -> needs faculty review
  feedback: string;
}

export interface TopicPerformance {
  topic: string;
  scored: number;
  max: number;
  percent: number;
}

export interface AttemptResult {
  totalMarks: number;
  scoredMarks: number;
  percent: number;
  grade: string;
  questions: AttemptQuestionResult[];
  topics: TopicPerformance[];
  weakTopics: string[];
  suggestions: string[];
  summary: string;
  engine?: 'LLM' | 'LOCAL'; // which evaluator produced the marks
}

export interface ExamAttempt {
  id: string;
  assessmentId: string;
  examTitle: string;
  subject: string;
  studentId: string;
  studentName: string;
  studentRoll: string;
  answers: Record<string, string>;
  submittedAt: string;
  violations: number;
  terminated: boolean;       // auto-submitted due to integrity violations
  result: AttemptResult;
  // --- Added so the gradebook can pick up this attempt's marks ---
  courseCode?: string;
  assessmentType?: AssessmentComponent;
}

export interface ProctoringViolation {
  id: string;
  studentRoll: string;
  studentName: string;
  anomalyType: ProctoringAnomalyType;
  timestamp: string;
  confidenceScore: number;
  tabSwitchCount: number;
  integrityRating: number; // 0 - 100
  snapshot?: string;       // small JPEG data-URL captured by the webcam when the event was flagged
}

export interface QuestionEvaluation {
  questionId: string;
  questionPrompt: string;
  maxMarks: number;
  modelAnswer: string;
  studentAnswer: string;
  awardedMarks: number;
  aiConfidence: number; // 0.0 - 1.0
  reasoning: string;
  feedback: string;
  status: 'AI_GRADED' | 'MANUALLY_OVERRIDDEN' | 'PENDING';
}

export interface StudentDescriptiveSubmission {
  id: string;
  studentRoll: string;
  studentName: string;
  courseCode: string;
  examTitle: string;
  submittedAt: string;
  totalMarks: number;
  scoredMarks: number;
  evaluationStatus: 'PENDING' | 'EVALUATED' | 'PUBLISHED';
  questions: QuestionEvaluation[];
}
