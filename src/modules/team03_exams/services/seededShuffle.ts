// Per-student randomisation: every student gets a different but stable (refresh-safe) question and option order.
import { ExamQuestion } from '../types/exams.types';

const hashSeed = (str: string): number => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const shuffle = <T,>(items: T[], rand: () => number): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const shuffleForStudent = (questions: ExamQuestion[], seedText: string): ExamQuestion[] => {
  const rand = mulberry32(hashSeed(seedText));
  return shuffle(questions, rand).map(q =>
    (q.type === 'MCQ' || q.type === 'MULTI_SELECT') && q.options?.length
      ? { ...q, options: shuffle(q.options, rand) }
      : q
  );
};
