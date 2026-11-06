/** 학습 콘텐츠 스키마 — 모든 레벨 파일(levelN.ts, sql.ts)이 이 타입을 따른다. */

export type CodeLang = 'java' | 'sql' | 'text' | 'yaml' | 'http';

/** 공부방에서 읽는 개념 카드의 문단 블록 */
export type LessonBlock =
  | { t: 'p'; text: string }
  | { t: 'code'; lang: CodeLang; code: string }
  | { t: 'list'; items: string[] }
  | { t: 'tip'; text: string } // 💡 실무 팁 / 자주 하는 실수
  | { t: 'table'; head: string[]; rows: string[][] };

export interface Lesson {
  id: string; // 'l1-variables' 처럼 레벨 접두사 + kebab
  level: number;
  title: string;
  summary: string; // 한 줄 요약 (카드 목록에 보임)
  blocks: LessonBlock[];
}

/** 문제 유형 라벨 — 화면에 뱃지로 표시 */
export type QuestionType = '개념' | '코드 출력' | '빈칸 채우기' | '버그 찾기' | '실무 상황' | 'OX' | 'SQL';

/** 모든 퀴즈는 객관식(보기 2~5개). OX 는 choices: ['O', 'X'] */
export interface Question {
  id: string; // 'q1-001' 처럼 레벨 + 번호
  level: number;
  type: QuestionType;
  topic: string; // 짧은 주제명 (예: '형변환', 'JOIN')
  prompt: string;
  code?: string; // 문제에 딸린 코드 (있으면 코드 블록으로 표시)
  codeLang?: CodeLang; // 기본 'java'
  choices: string[];
  answer: number; // choices 의 0-based 인덱스
  explain: string; // 정답 해설 — 왜 맞고 왜 틀린지까지
}

/** 실무실 SQL 미션 — 브라우저 안 SQLite(seed.sql 의 회사 DB)에서 실제로 실행해 채점 */
export interface SqlMission {
  id: string; // 'sql-01'
  level: number; // 열리는 레벨
  title: string;
  story: string; // 실무 상황 설명 ("기획팀에서 ~ 뽑아달래요")
  prompt: string; // 구체적 요구사항 (출력 컬럼·정렬 명시)
  answer: string; // 정답 SQL — 결과를 비교하는 기준
  orderMatters: boolean; // ORDER BY 가 요구사항이면 true
  hints: string[]; // 단계별 힌트 1~3개
  explain: string; // 풀이 해설
}

export interface LevelContent {
  level: number;
  lessons: Lesson[];
  questions: Question[];
}
