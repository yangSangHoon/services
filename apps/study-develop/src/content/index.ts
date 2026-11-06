import l1 from './level1';
import l2 from './level2';
import l3 from './level3';
import l4 from './level4';
import l5 from './level5';
import l6 from './level6';
import l7 from './level7';
import l8 from './level8';
import l9 from './level9';
import l10 from './level10';
import { sqlMissions } from './sqlMissions';
import type { Lesson, Question } from './types';

export const CONTENT = [l1, l2, l3, l4, l5, l6, l7, l8, l9, l10];
export const SQL_MISSIONS = sqlMissions;

export const lessonsOf = (lv: number): Lesson[] => CONTENT[lv - 1]?.lessons ?? [];
export const questionsOf = (lv: number): Question[] => CONTENT[lv - 1]?.questions ?? [];
export const ALL_QUESTIONS: Question[] = CONTENT.flatMap((c) => c.questions);
const byId = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));
export const questionById = (id: string) => byId.get(id);
