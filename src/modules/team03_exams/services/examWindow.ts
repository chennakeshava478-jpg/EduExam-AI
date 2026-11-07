// Scheduled test window: the exam can only be opened between startTime and endTime on the scheduled date.
import { AssessmentItem } from '../types/exams.types';

export type WindowState = 'OPEN' | 'UPCOMING' | 'CLOSED';
export interface ExamWindow { state: WindowState; startMs?: number; endMs?: number; label: string; }

const at = (date: string, time: string): number => new Date(`${date}T${time}:00`).getTime();

export const getExamWindow = (a: Pick<AssessmentItem, 'scheduledDate' | 'startTime' | 'endTime'>, now: number = Date.now()): ExamWindow => {
  if (!a.startTime && !a.endTime) return { state: 'OPEN', label: '' };
  const startMs = at(a.scheduledDate, a.startTime || '00:00');
  const endMs = a.endTime ? at(a.scheduledDate, a.endTime) : undefined;
  const label = `${a.scheduledDate} · ${a.startTime || '00:00'}${a.endTime ? ` – ${a.endTime}` : ''}`;
  if (now < startMs) return { state: 'UPCOMING', startMs, endMs, label };
  if (endMs !== undefined && now >= endMs) return { state: 'CLOSED', startMs, endMs, label };
  return { state: 'OPEN', startMs, endMs, label };
};
