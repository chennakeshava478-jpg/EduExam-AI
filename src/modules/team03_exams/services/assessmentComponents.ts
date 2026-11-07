// 60:40 NEP structure: which gradebook column each paper type feeds, and its maximum marks.
import { AssessmentComponent } from '../types/exams.types';

export interface AssessmentComponentMeta {
  value: AssessmentComponent;
  label: string;
  maxMarks: number;
  gradebookField: 'fa1' | 'midTerm' | 'fa2' | 'presentation' | 'summative';
}

export const ASSESSMENT_COMPONENTS: AssessmentComponentMeta[] = [
  { value: 'FA1',          label: 'FA-1 Unit Test',          maxMarks: 15, gradebookField: 'fa1' },
  { value: 'MIDTERM',      label: 'Mid-Term Exam',           maxMarks: 20, gradebookField: 'midTerm' },
  { value: 'FA2',          label: 'FA-2 / Lab Code',         maxMarks: 15, gradebookField: 'fa2' },
  { value: 'PRESENTATION', label: 'Presentation',            maxMarks: 10, gradebookField: 'presentation' },
  { value: 'SEE',          label: 'Semester End Exam (SEE)', maxMarks: 40, gradebookField: 'summative' }
];

export const getComponentMeta = (v?: AssessmentComponent) => ASSESSMENT_COMPONENTS.find(c => c.value === v);
