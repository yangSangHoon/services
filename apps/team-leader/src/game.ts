// 버텨라, 팀장님 — 캔버스 게임 엔진 (React 와 분리된 순수 TS)

export type KindId = 'complain' | 'late' | 'slack' | 'customer' | 'order' | 'layoff' | 'good';
type Source = 'member' | 'boss' | 'ceo' | 'phone';

interface KindDef {
  name: string;
  cause: string; // 퇴사 사유 문구
  source: Source;
  icon: string;
  tip: string; // 첫 등장 안내
  texts: string[];
  lateTexts: string[]; // 50세 이후에 섞이는 대사
  quips: string[]; // 막았을 때 팀장의 대응
  speed: number; // 기준 필드 반지름 200px 일 때 px/s
  dmg: number;
  fill: string;
  ink: string;
}

export const KINDS: Record<KindId, KindDef> = {
  complain: {
    name: '팀원 불만',
    cause: '팀원들의 불만 폭주',
    source: 'member',
    icon: '😤',
    tip: '똑바로 날아와요. 방패로 막으세요',
    texts: [
      '이걸 왜 제가요?', '회의 너무 많아요', '연봉 얘기 좀…', '단톡 그만요', '저만 일해요', '평가 납득 안 돼요',
      '자리 바꿔주세요', '점심 메뉴 또요?', '그건 제 R&R 아닌데요', '재택 왜 안 돼요?', '회식 꼭 가야 돼요?',
      '피드백이 너무 추상적이에요', '다른 팀은 칼퇴하던데요', '이거 야근 수당 나와요?', '저 이직 제안 받았어요',
    ],
    lateTexts: ['팀장님 언제 은퇴하세요?', '꼰대 소리 들으세요', '요즘은 그렇게 안 해요', '그건 옛날 방식이에요'],
    quips: ['검토해볼게요', '좋은 의견이네', '1on1 때 얘기하자', '음… 알겠어요', '그 마음 알아요'],
    speed: 105,
    dmg: 9,
    fill: '#ffe1b8',
    ink: '#7a3d00',
  },
  late: {
    name: '지각',
    cause: '끝없는 지각',
    source: 'member',
    icon: '⏰',
    tip: '느리게 오다가 갑자기 돌진해요!',
    texts: [
      '차가 막혀서요', '알람이 안 울렸어요', '병원 들렀다 갈게요', '5분만요!', '지하철 고장이요',
      '고양이가 아파서요', '택배 받고 갈게요', '엘리베이터가 안 와요', '버스 놓쳤어요', '눈이 와서요', '어제 야근해서요',
    ],
    lateTexts: ['반차 쓸게요(통보)', '저 오늘 재택이요(통보)', '출근 시간은 해석의 영역이죠'],
    quips: ['내일은 일찍 와', '…커피 사 와', '근태 찍었어?', '알람 두 개 맞춰'],
    speed: 55,
    dmg: 9,
    fill: '#fff3a8',
    ink: '#6b5600',
  },
  slack: {
    name: '업무 태만',
    cause: '업무 떠넘기기',
    source: 'member',
    icon: '🛋️',
    tip: '세 번 연달아 떠넘겨요. 방패를 대고 버티세요',
    texts: [
      '팀장님이 해주세요', '저 그거 몰라요', '내일 할게요', '쇼핑 중', '유튜브 잠깐', '이건 팀장님 일 아니에요?',
      '저 오늘 반차요', '그거 아직 안 봤어요', '메일 못 받았는데요', '담당자가 누구죠?',
    ],
    lateTexts: ['AI한테 시켰는데요', '챗봇이 해준대요', '자동화 될 때까지 기다려요'],
    quips: ['…내가 할게', '마감 언제였지?', '같이 하자', '다시 한 번만'],
    speed: 150,
    dmg: 5,
    fill: '#e3e0ff',
    ink: '#3b2f99',
  },
  customer: {
    name: '고객 컴플레인',
    cause: '고객 컴플레인',
    source: 'phone',
    icon: '☎️',
    tip: '어디서 올지 몰라요. 전화벨 방향을 보세요!',
    texts: [
      '책임자 나와!', '환불해 주세요!!', '별점 1개요', '본사에 말할게요', '이게 최선이에요?',
      '녹음하고 있어요', '내가 누군지 알아?', '어제 전화했잖아요', '블로그에 올릴게요', '담당자 바꿔요',
    ],
    lateTexts: ['요즘 젊은 직원 바꿔줘요', '유튜브에 박제할게요'],
    quips: ['죄송합니다 고객님', '바로 확인하겠습니다', '불편을 드려…', '네 고객님!'],
    speed: 175,
    dmg: 11,
    fill: '#ffd0d0',
    ink: '#8a1010',
  },
  order: {
    name: '불합리한 지시',
    cause: '상사의 무리한 지시',
    source: 'boss',
    icon: '📋',
    tip: '좌우로 흔들리며 와요. 끝까지 따라가세요',
    texts: [
      '내일까지 다시', '주말에 잠깐만', '어제 말한 거 반대로', '대표님 취향으로', '예산은 없어', '왜 아직이야?',
      'PPT 한 장으로', '숫자 좀 예쁘게', '일단 해보고', '경쟁사는 하던데?', '빨리 하지 말고 잘 해',
    ],
    lateTexts: ['AI로 하면 반나절이잖아', '젊은 감각으로 다시', '그거 자네 세대 방식이야'],
    quips: ['넵 알겠습니다', '검토 후 보고드리겠습니다', '넵!(속으로 한숨)', '방향 확인해볼게요'],
    speed: 100,
    dmg: 13,
    fill: '#d6ecff',
    ink: '#0b4a85',
  },
  layoff: {
    name: '희망퇴직 압박',
    cause: '희망퇴직 압박',
    source: 'ceo',
    icon: '📉',
    tip: '묵직해요. 두 번 막아야 끝나요',
    texts: ['희망퇴직 면담', '자리 재배치', '후배가 팀장으로', '임원 면담 좀', '조직 슬림화', '위로금 조건 좋을 때', '제2의 인생 응원해'],
    lateTexts: ['정년까지 꼭 있어야 해?', '자회사 가볼래?'],
    quips: ['버텼다!'],
    speed: 62,
    dmg: 26,
    fill: '#3a3a44',
    ink: '#ffffff',
  },
  good: {
    name: '응원',
    cause: '',
    source: 'member',
    icon: '☕',
    tip: '응원은 막지 말고 받으세요! 멘탈이 회복돼요',
    texts: ['☕ 커피 드세요', '🍗 치킨 쐈어요', '👍 팀장님 최고', '🍩 간식이요', '💌 감사해요', '🍰 생일 축하해요', '🧃 비타민이요'],
    lateTexts: ['🌿 건강 챙기세요', '💊 영양제요'],
    quips: [],
    speed: 95,
    dmg: -8,
    fill: '#cff5d6',
    ink: '#0d6b26',
  },
};

export const ATTACK_KINDS: KindId[] = ['complain', 'late', 'slack', 'customer', 'order', 'layoff'];

// 51세 이후 해마다 하나씩 붙는 규칙 변주
type RuleId = 'freeze' | 'tf' | 'reorg' | 'peak' | 'junior' | 'layoff2' | 'relay' | 'finale';

interface YearDef {
  title: string;
  desc: string;
  mix: Partial<Record<KindId, number>>;
  rule?: RuleId;
}

export const START_AGE = 45;
/** 방패 폭: 해가 갈수록(스테이지마다) 조금씩 좁아진다. 특전 '더 넓은 방패'는 그 위에 더해진다 */
export const SHIELD_BASE_DEG = 64;
export const SHIELD_SHRINK_DEG = 1.8; // 1년(스테이지)마다 줄어드는 각도
export const SHIELD_MIN_DEG = 38;
/** 공격 판정점(작은 원) 반지름 — 기준 필드 200px 기준 */
export const HIT_DOT_R = 5;
export const RETIRE_AGE = 60;
const YEAR_LEN = 20;

const YEARS: YearDef[] = [
  { title: '팀장 승진', desc: '축하합니다! 오늘부터 불만은 전부 팀장 몫', mix: { complain: 1, good: 0.25 } },
  { title: '신입 입사', desc: '알람이 안 울렸대요. 매일요.', mix: { complain: 0.8, late: 0.8, good: 0.25 } },
  { title: '클레임 시즌', desc: '고객 전화는 어디서 올지 몰라요', mix: { complain: 0.6, late: 0.4, customer: 0.9, good: 0.25 } },
  { title: '새 상무님 부임', desc: '지시가 이리저리 흔들립니다', mix: { complain: 0.5, late: 0.3, customer: 0.4, order: 1, good: 0.25 } },
  { title: '조용한 퇴사 유행', desc: '일이 한꺼번에 떠넘겨집니다', mix: { complain: 0.5, late: 0.3, customer: 0.3, order: 0.5, slack: 0.9, good: 0.25 } },
  { title: '구조조정 바람', desc: '사장님이 자리에 앉았습니다. 묵직한 건 두 번 막으세요', mix: { complain: 0.5, late: 0.3, customer: 0.3, order: 0.5, slack: 0.4, layoff: 0.45, good: 0.25 } },
  { title: '연봉 동결', desc: '응원도 동결. 올해는 커피가 안 옵니다', rule: 'freeze', mix: { complain: 1.0, late: 0.3, customer: 0.3, order: 0.4, slack: 0.4, layoff: 0.35 } },
  { title: '신사업 TF 차출', desc: 'TF장이 한 명 더. 지시가 두 방향에서 옵니다', rule: 'tf', mix: { complain: 0.4, customer: 0.4, order: 1.2, slack: 0.4, layoff: 0.2, good: 0.25 } },
  { title: '조직개편', desc: '10초 뒤 팀원들 자리가 바뀝니다', rule: 'reorg', mix: { complain: 0.6, late: 0.4, customer: 0.5, order: 0.6, slack: 0.6, layoff: 0.3, good: 0.25 } },
  { title: 'MZ 신입 대거 입사', desc: '출근 시간은 각자의 해석', mix: { complain: 0.5, late: 1, slack: 0.8, customer: 0.3, order: 0.4, layoff: 0.2, good: 0.35 } },
  { title: '임금피크제', desc: '월급도 멘탈도 줄었습니다. 올해 최대 멘탈 -15', rule: 'peak', mix: { complain: 0.6, late: 0.4, customer: 0.6, order: 0.7, slack: 0.5, layoff: 0.4, good: 0.3 } },
  { title: '후배가 상무로', desc: '어제의 정인턴이 오늘의 정상무. 지시가 더 크게 흔들려요', rule: 'junior', mix: { complain: 0.4, late: 0.3, customer: 0.4, order: 1.3, slack: 0.4, layoff: 0.4, good: 0.25 } },
  { title: '희망퇴직 2차', desc: '면담이 더 끈질겨졌어요. 세 번 막아야 끝나요', rule: 'layoff2', mix: { complain: 0.5, late: 0.3, customer: 0.4, order: 0.6, slack: 0.4, layoff: 0.8, good: 0.3 } },
  { title: '마지막 대형 프로젝트', desc: '팀원들이 차례로 몰아칩니다', rule: 'relay', mix: { complain: 0.7, late: 0.5, customer: 0.6, order: 0.7, slack: 0.6, layoff: 0.4, good: 0.3 } },
  { title: '정년 D-1년', desc: '끝까지 버티세요. 마지막엔 사장님 면담이…', rule: 'finale', mix: { complain: 0.7, late: 0.5, customer: 0.7, order: 0.8, slack: 0.6, layoff: 0.6, good: 0.35 } },
];

export function yearInfo(age: number) {
  return YEARS[Math.min(YEARS.length - 1, Math.max(0, age - START_AGE))];
}

/** age 해까지 한 번이라도 등장한 공격 종류 */
function kindsUpTo(age: number): Set<KindId> {
  const out = new Set<KindId>();
  for (let i = 0; i <= Math.min(YEARS.length - 1, age - START_AGE); i++)
    for (const k of Object.keys(YEARS[i].mix) as KindId[]) out.add(k);
  return out;
}

// ---------- 특전 (연말 인사평가) ----------
export type PerkId = 'wide' | 'back' | 'yoga' | 'coffee' | 'oneonone' | 'mute' | 'line' | 'zen';
export interface PerkDef {
  id: PerkId;
  emoji: string;
  name: string;
  desc: string;
  max?: number; // 최대 중첩
  needs?: KindId[]; // 이 공격 중 하나라도 나와야 후보가 됨
}
export const PERKS: PerkDef[] = [
  { id: 'wide', emoji: '🛡️', name: '더 넓은 방패', desc: '방패가 12° 넓어져요 (최대 4번)', max: 4 },
  { id: 'back', emoji: '🔙', name: '등 뒤 방패', desc: '등 뒤에 작은 방패가 하나 더', max: 1 },
  { id: 'yoga', emoji: '🧘', name: '아침 요가', desc: '최대 멘탈 +20, 멘탈 40 회복' },
  { id: 'coffee', emoji: '☕', name: '커피머신 도입', desc: '팀원 응원이 더 자주 오고 회복량 +25%' },
  { id: 'oneonone', emoji: '🗣️', name: '1on1 면담', desc: '팀원 공격 피해 -25%' },
  { id: 'mute', emoji: '📵', name: '퇴근 후 알림 끄기', desc: '고객 컴플레인 피해 -50%, 전화벨이 더 일찍 울려요', needs: ['customer'] },
  { id: 'line', emoji: '🤝', name: '라인 잘 타기', desc: '상사·사장 공격 피해 -30%', needs: ['order', 'layoff'] },
  { id: 'zen', emoji: '🍵', name: '평정심', desc: '가만히 있어도 멘탈이 조금씩 회복 (최대 3번)', max: 3 },
];

/** 연말 인사평가 등급: 그해 맞은 횟수로 */
export type Grade = 'S' | 'A' | 'B' | 'C';
export function gradeOf(hits: number): Grade {
  return hits === 0 ? 'S' : hits <= 2 ? 'A' : hits <= 5 ? 'B' : 'C';
}

export function rollPerks(taken: Record<string, number>, nextAge: number, n = 3): PerkDef[] {
  const seen = kindsUpTo(nextAge);
  const pool = PERKS.filter(
    (p) => (p.max === undefined || (taken[p.id] ?? 0) < p.max) && (!p.needs || p.needs.some((k) => seen.has(k))),
  );
  const out: PerkDef[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

// ---------- 칭호 ----------
export interface RunResult {
  retired: boolean;
  age: number;
  cause: string;
  lastHit: KindId;
  blocked: Record<KindId, number>;
  hits: Record<KindId, number>;
  totalBlocked: number;
  totalHits: number;
  bestStreak: number;
  sYears: number;
  finaleBlocked: boolean;
  perks: Record<string, number>;
}

export interface TitleDef {
  id: string;
  name: string;
  desc: string;
  test: (r: RunResult) => boolean;
}
export const TITLES: TitleDef[] = [
  { id: 'retire', name: '🎉 무사 정년', desc: '60세 정년퇴임', test: (r) => r.retired },
  { id: 'iron', name: '🏆 철벽 팀장', desc: '10번 이하로 맞고 정년퇴임', test: (r) => r.retired && r.totalHits <= 10 },
  { id: 'finale', name: '🧓 사장님도 인정한 팀장', desc: '마지막 면담을 막아냄', test: (r) => r.finaleBlocked },
  { id: 'sclass', name: '✨ S급 인재', desc: '인사평가 S 5번 이상', test: (r) => r.sYears >= 5 },
  { id: 'god', name: '🔥 갓팀장', desc: '50연속 방어', test: (r) => r.bestStreak >= 50 },
  { id: 'survivor', name: '📉 구조조정 생존자', desc: '희망퇴직 압박 10번 이상 막음', test: (r) => r.blocked.layoff >= 10 },
  { id: 'caffeine', name: '☕ 카페인 중독', desc: '응원 30번 이상 받음', test: (r) => r.hits.good >= 30 },
  { id: 'lonely', name: '🥶 고독한 팀장', desc: '50세 넘도록 응원을 한 번도 안 받음', test: (r) => r.age >= 50 && r.hits.good === 0 },
  { id: 'trial', name: '🐣 팀장 체험판', desc: '47세 전에 퇴사', test: (r) => !r.retired && r.age < 47 },
  { id: 'c-complain', name: '😤 불만 수거함', desc: '팀원 불만으로 퇴사', test: (r) => !r.retired && r.lastHit === 'complain' },
  { id: 'c-late', name: '⏰ 근태 담당 팀장', desc: '지각으로 퇴사', test: (r) => !r.retired && r.lastHit === 'late' },
  { id: 'c-slack', name: '🛋️ 결국 혼자 다 함', desc: '업무 떠넘기기로 퇴사', test: (r) => !r.retired && r.lastHit === 'slack' },
  { id: 'c-customer', name: '☎️ 콜센터의 전설', desc: '고객 컴플레인으로 퇴사', test: (r) => !r.retired && r.lastHit === 'customer' },
  { id: 'c-order', name: '📋 영혼까지 결재됨', desc: '무리한 지시로 퇴사', test: (r) => !r.retired && r.lastHit === 'order' },
  { id: 'c-layoff', name: '📦 희망(?)퇴직', desc: '희망퇴직 압박으로 퇴사', test: (r) => !r.retired && r.lastHit === 'layoff' },
];
export const titlesOf = (r: RunResult) => TITLES.filter((t) => t.test(r));

export type SoundName = 'block' | 'hit' | 'heal' | 'heavy' | 'warn' | 'year' | 'over' | 'combo' | 'new' | 'fanfare';

export interface GameCallbacks {
  onYearEnd: (age: number, grade: Grade) => void;
  onEnd: (r: RunResult) => void;
  onSound: (s: SoundName) => void;
  onBuzz: (ms: number) => void;
  onNewKind?: (k: KindId) => void;
}

// ---------- 엔티티 ----------
interface Avatar {
  source: Source;
  emoji: string;
  name: string;
  angle: number; // 현재 (조직개편 때 이동)
  home: number; // 목표 자리
  orig: number; // 원래 자리
  wind: number; // 예고 남은 시간
  pending: KindId | null;
  only?: RuleId; // 이 규칙의 해에만 등장
  hideIn?: RuleId; // 이 규칙의 해엔 자리 비움
  finale?: boolean;
}

interface Proj {
  kind: KindId;
  text: string;
  base: number; // 진행 방향 각도 (중심 기준)
  theta: number; // 현재 각도 (흔들림 반영)
  dist: number;
  start: number;
  speed: number;
  t: number;
  phase: number;
  hp: number;
  dashing: boolean;
  dead: boolean;
  finale?: boolean;
  w?: number;
  bounce?: number; // 막혀서 튕겨 나가는 연출 시간
}

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
  life: number;
  size: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  color: string;
  g: number; // 중력 (꽃가루)
}

interface Phone {
  angle: number;
  t: number;
  total: number;
  kind: KindId;
}

interface Queued {
  at: number;
  kind: KindId;
  base: number;
  chain: boolean; // 업무 떠넘기기 2·3번째
  delayed: boolean; // 동시 도착 방지로 한 번 미뤄진 것
}

const TAU = Math.PI * 2;
const wrap = (a: number) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
const deg = (d: number) => (d * Math.PI) / 180;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const zeroCounts = (): Record<KindId, number> => ({ complain: 0, late: 0, slack: 0, customer: 0, order: 0, layoff: 0, good: 0 });

const WIND = 0.6;
const DASH_AT = 0.62; // 지각: 남은 거리 비율이 이 아래로 오면 돌진
const DASH_MUL = 4.2;
const SAFE_GAP = 0.25; // 이 시간 안에
const SAFE_ANGLE = deg(120); // 이 각도 이상 떨어져 도착하면 미룸
const STREAK_TITLES: Record<number, string> = { 10: '칼답 팀장', 25: '프로 방어러', 50: '갓팀장', 100: '전설의 팀장' };
const CONFETTI = ['#ff5a5a', '#ffc93c', '#3cc46a', '#4a9dff', '#9d6bff', '#ff8ad8'];

export class Game {
  // 화면
  w = 0;
  h = 0;
  cx = 0;
  cy = 0;
  fieldR = 200;
  s = 1; // fieldR / 200
  dark = false;

  // 상태
  age = START_AGE;
  yearT = 0;
  introT = 0;
  maxMental = 100;
  mental = 100;
  shield = -Math.PI / 2;
  target = -Math.PI / 2;
  keyDir = 0;
  spawnT = 1;
  streak = 0;
  bestStreak = 0;
  shake = 0;
  hurtT = 0;
  blockFlash = 0;
  ended = false;
  waiting = false; // 연말 인사평가 대기
  endT = 0;
  lastHit: KindId = 'complain';
  perks: Record<string, number> = {};
  blocked = zeroCounts();
  hits = zeroCounts();
  time = 0;
  yearHits = 0;
  sYears = 0;
  peakPenalty = 0;
  reorgStep = 0;
  relayT = 0;
  finale = 0; // 0 아직, 1 면담 중, 2 끝 (축하 연출)
  finaleT = 0;
  finaleBlocked = false;
  stopT = 0; // 히트스톱
  slowT = 0; // 새 공격 소개 슬로모션
  tipT = 0;
  tipText = '';
  bannerT = 0;
  bannerText = '';

  avatars: Avatar[] = [];
  projs: Proj[] = [];
  floaters: Floater[] = [];
  sparks: Spark[] = [];
  phones: Phone[] = [];
  queue: Queued[] = [];
  seen: Set<KindId>;

  constructor(
    private cb: GameCallbacks,
    seen: Iterable<KindId> = [],
  ) {
    this.seen = new Set(seen);
    const members: [string, string, RuleId?][] = [
      ['🧑‍💻', '김대리'],
      ['👩‍💼', '이과장'],
      ['👨‍💻', '박주임'],
      ['🧑‍🎨', '최사원'],
      ['👩‍🔬', '정인턴', 'junior'],
    ];
    const angles = [-12, 38, 90, 142, 192];
    members.forEach(([emoji, name, hideIn], i) => this.addAvatar({ source: 'member', emoji, name, hideIn }, angles[i]));
    this.addAvatar({ source: 'boss', emoji: '🤵', name: '상무' }, -128);
    this.addAvatar({ source: 'boss', emoji: '🕴️', name: 'TF장', only: 'tf' }, -95);
    this.addAvatar({ source: 'ceo', emoji: '🧓', name: '사장' }, -62);
    this.startYear();
  }

  private addAvatar(a: Pick<Avatar, 'source' | 'emoji' | 'name' | 'only' | 'hideIn'>, angleDeg: number) {
    const r = deg(angleDeg);
    this.avatars.push({ ...a, angle: r, home: r, orig: r, wind: 0, pending: null });
  }

  // ---------- 외부 입력 ----------
  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    const top = 74; // HUD 높이
    this.cx = w / 2;
    this.cy = top + (h - top) / 2;
    this.fieldR = Math.max(120, Math.min(w / 2 - 8, (h - top) / 2 - 8, 330));
    this.s = this.fieldR / 200;
  }

  pointer(x: number, y: number) {
    const dx = x - this.cx;
    const dy = y - this.cy;
    if (dx * dx + dy * dy < 9) return;
    this.target = Math.atan2(dy, dx);
  }

  get leaderR() {
    return 26 * this.s;
  }
  get shieldR() {
    return 62 * this.s;
  }
  get arc() {
    const base = Math.max(SHIELD_MIN_DEG, SHIELD_BASE_DEG - SHIELD_SHRINK_DEG * this.yearIndex);
    return deg(base + 12 * Math.min(4, this.perks.wide ?? 0));
  }
  get rule(): RuleId | undefined {
    return yearInfo(this.age).rule;
  }

  applyPerk(id: PerkId) {
    this.perks[id] = (this.perks[id] ?? 0) + 1;
    if (id === 'yoga') {
      this.maxMental += 20;
      this.mental = Math.min(this.maxMental, this.mental + 40);
    }
  }

  nextYear() {
    this.waiting = false;
    this.age += 1;
    this.startYear();
  }

  private startYear() {
    this.yearT = 0;
    this.introT = 2.2;
    this.spawnT = 1.0;
    this.yearHits = 0;
    this.reorgStep = 0;
    this.relayT = 3;
    this.projs = [];
    this.queue = [];
    this.phones = [];
    for (const a of this.avatars) {
      a.wind = 0;
      a.pending = null;
      a.home = a.orig;
      a.angle = a.orig;
    }
    if (this.peakPenalty) {
      this.maxMental += this.peakPenalty;
      this.peakPenalty = 0;
    }
    if (this.rule === 'peak') {
      this.peakPenalty = 15;
      this.maxMental -= 15;
      this.mental = Math.min(this.mental, this.maxMental);
    }
  }

  get yearIndex() {
    return this.age - START_AGE;
  }

  get ceoPresent() {
    return this.age >= START_AGE + 5;
  }

  private active(a: Avatar) {
    if (a.source === 'ceo' && !this.ceoPresent) return false;
    if (a.only && a.only !== this.rule) return false;
    if (a.hideIn && a.hideIn === this.rule) return false;
    return true;
  }

  // ---------- 업데이트 ----------
  update(dt: number) {
    dt = Math.min(dt, 0.05);
    const real = dt;
    this.time += real;
    this.tipT = Math.max(0, this.tipT - real);
    this.bannerT = Math.max(0, this.bannerT - real);
    if (this.stopT > 0) {
      this.stopT -= real;
      return;
    }
    if (this.slowT > 0) {
      this.slowT -= real;
      dt *= 0.4;
    }

    // 방패 회전 (슬로모션 중에도 손은 그대로)
    if (this.keyDir) this.target = this.shield + this.keyDir * 0.5;
    const diff = wrap(this.target - this.shield);
    const maxStep = (this.keyDir ? 5.5 : 22) * real;
    this.shield = wrap(this.shield + Math.max(-maxStep, Math.min(maxStep, diff)));

    this.shake = Math.max(0, this.shake - real * 2.5);
    this.hurtT = Math.max(0, this.hurtT - real);
    this.blockFlash = Math.max(0, this.blockFlash - real * 4);
    this.introT = Math.max(0, this.introT - dt);

    for (const f of this.floaters) {
      f.t += real;
      f.y -= 28 * real;
    }
    this.floaters = this.floaters.filter((f) => f.t < f.life);
    for (const p of this.sparks) {
      p.t += real;
      p.x += p.vx * real;
      p.y += p.vy * real;
      p.vy += p.g * real;
      p.vx *= p.g ? 0.99 : 0.92;
      p.vy *= p.g ? 0.99 : 0.92;
    }
    this.sparks = this.sparks.filter((p) => p.t < p.life);

    // 조직개편: 자리 이동 애니메이션
    for (const a of this.avatars) a.angle = wrap(a.angle + wrap(a.home - a.angle) * Math.min(1, real * 5));

    if (this.waiting) return;
    if (this.ended) {
      this.endT += dt;
      // 남은 공격들은 계속 흘러가게
      for (const p of this.projs) this.moveProj(p, dt);
      return;
    }

    if (this.perks.zen) this.mental = Math.min(this.maxMental, this.mental + 0.4 * this.perks.zen * dt);

    if (this.introT <= 0 && !this.finale) this.yearT += dt;
    const yearOver = this.yearT >= YEAR_LEN;
    const live = this.introT <= 0 && !yearOver;

    // 스폰
    if (live) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        const rate = 1.0 + this.yearIndex * 0.085;
        this.spawnT = (1 / rate) * (0.7 + Math.random() * 0.6);
        this.spawn();
      }
      this.yearRules(dt);
    }

    // 예고 → 발사
    for (const a of this.avatars) {
      if (!a.pending) continue;
      a.wind -= dt;
      if (a.wind <= 0) {
        if (a.finale) this.launchFinale(a.angle);
        else this.launch(a.pending, a.angle);
        a.pending = null;
        a.finale = false;
      }
    }
    for (const ph of this.phones) {
      ph.t -= dt;
      if (ph.t <= 0) this.launch(ph.kind, ph.angle);
    }
    this.phones = this.phones.filter((p) => p.t > 0);
    const due = this.queue.filter((q) => (q.at -= dt) <= 0);
    this.queue = this.queue.filter((q) => q.at > 0);
    for (const q of due) this.launch(q.kind, q.base, q.chain, q.delayed);

    for (const p of this.projs) this.moveProj(p, dt);
    this.projs = this.projs.filter((p) => !p.dead);

    if (this.mental <= 0) {
      this.mental = 0;
      this.ended = true;
      this.cb.onSound('over');
      this.cb.onBuzz(300);
      setTimeout(() => this.cb.onEnd(this.result(false)), 1100);
      return;
    }

    const busy =
      this.projs.length || this.queue.length || this.phones.length || this.avatars.some((a) => a.pending && this.active(a));

    // 정년 직전: 사장님의 마지막 면담
    if (this.rule === 'finale' && yearOver) {
      if (this.finale === 0 && !busy) {
        this.finale = 1;
        const ceo = this.avatars.find((a) => a.source === 'ceo')!;
        ceo.pending = 'layoff';
        ceo.finale = true;
        ceo.wind = 1.6;
        this.banner('사장님: 잠깐 얘기 좀 할까?', 1.8);
        this.cb.onSound('warn');
        return;
      }
      if (this.finale === 2) {
        this.finaleT += dt;
        if (this.finaleT > 0.35 && this.finaleT < 1.8 && Math.random() < dt * 14) this.confetti(this.cx + (Math.random() - 0.5) * this.w, -10, 1);
        if (this.finaleT >= 2.6) {
          this.ended = true;
          this.age = RETIRE_AGE;
          this.cb.onEnd(this.result(true));
        }
      }
      return;
    }

    if (yearOver && !busy) {
      if (this.yearHits === 0) this.sYears += 1;
      this.waiting = true;
      this.hurtT = 0;
      this.shake = 0;
      this.floaters = [];
      this.cb.onSound('year');
      this.cb.onYearEnd(this.age, gradeOf(this.yearHits));
    }
  }

  private yearRules(dt: number) {
    const rule = this.rule;
    if (rule === 'reorg') {
      if (this.reorgStep === 0 && this.yearT >= 9) {
        this.reorgStep = 1;
        this.banner('📦 1초 뒤 자리 이동!', 1.2);
        this.cb.onSound('warn');
      }
      if (this.reorgStep === 1 && this.yearT >= 10) {
        this.reorgStep = 2;
        const ms = this.avatars.filter((a) => a.source === 'member' && this.active(a));
        const homes = ms.map((a) => a.home);
        const shift = 1 + Math.floor(Math.random() * (ms.length - 1));
        ms.forEach((a, i) => (a.home = homes[(i + shift) % ms.length]));
      }
    }
    if (rule === 'relay') {
      this.relayT -= dt;
      if (this.relayT <= 0) {
        this.relayT = 6.5;
        const ms = this.avatars
          .filter((a) => a.source === 'member' && this.active(a) && !a.pending)
          .sort((a, b) => wrap(a.angle) - wrap(b.angle));
        if (Math.random() < 0.5) ms.reverse();
        ms.forEach((a, i) => {
          a.pending = 'complain';
          a.wind = WIND + i * 0.45;
        });
        this.banner('🏃 릴레이 공격!', 1);
      }
    }
  }

  private banner(text: string, t: number) {
    this.bannerText = text;
    this.bannerT = t;
  }

  private result(retired: boolean): RunResult {
    const totalHits = ATTACK_KINDS.reduce((s, k) => s + this.hits[k], 0);
    return {
      retired,
      age: this.age,
      cause: KINDS[this.lastHit].cause,
      lastHit: this.lastHit,
      blocked: { ...this.blocked },
      hits: { ...this.hits },
      totalBlocked: ATTACK_KINDS.reduce((s, k) => s + this.blocked[k], 0),
      totalHits,
      bestStreak: this.bestStreak,
      sYears: this.sYears,
      finaleBlocked: this.finaleBlocked,
      perks: { ...this.perks },
    };
  }

  private pickKind(mix: Partial<Record<KindId, number>>): KindId | null {
    const entries = (Object.entries(mix) as [KindId, number][]).filter(([, v]) => v > 0);
    if (!entries.length) return null;
    let r = Math.random() * entries.reduce((s, [, v]) => s + v, 0);
    for (const [k, v] of entries) {
      r -= v;
      if (r <= 0) return k;
    }
    return entries[entries.length - 1][0];
  }

  private spawn() {
    const mix = { ...yearInfo(this.age).mix };
    if (this.rule === 'freeze') delete mix.good;
    if (mix.good) mix.good *= 1 + 0.4 * (this.perks.coffee ?? 0);
    let kind = this.pickKind(mix);
    if (!kind) return;
    if (KINDS[kind].source === 'phone') {
      const t = WIND + 0.2 * (this.perks.mute ?? 0);
      this.phones.push({ angle: Math.random() * TAU - Math.PI, t, total: t, kind });
      this.cb.onSound('warn');
      return;
    }
    let cands = this.avatars.filter((a) => a.source === KINDS[kind!].source && !a.pending && this.active(a));
    if (!cands.length) {
      // 상사·사장이 이미 준비 중이면 버리지 말고 팀원 공격으로 다시 뽑기
      const memberMix: Partial<Record<KindId, number>> = {};
      for (const k of ['complain', 'late', 'slack'] as KindId[]) if (mix[k]) memberMix[k] = mix[k];
      kind = this.pickKind(memberMix) ?? 'complain';
      cands = this.avatars.filter((a) => a.source === 'member' && !a.pending && this.active(a));
      if (!cands.length) return;
    }
    const a = pick(cands);
    a.pending = kind;
    a.wind = kind === 'layoff' ? WIND * 1.4 : WIND;
  }

  /** 방패에 닿기까지 남은 시간 추정 */
  private eta(kind: KindId, dist: number, start: number, speed: number, dashing: boolean) {
    const shR = this.shieldR;
    if (kind !== 'late') return (dist - shR) / speed;
    const th = start * DASH_AT;
    if (dashing || dist <= th) return Math.max(0, dist - shR) / (speed * DASH_MUL);
    return (dist - th) / speed + Math.max(0, th - shR) / (speed * DASH_MUL);
  }

  private launch(kind: KindId, angle: number, chain = false, delayed = false) {
    const def = KINDS[kind];
    const speed = def.speed * (1 + this.yearIndex * 0.045) * this.s;
    const start = this.fieldR - 34 * this.s;

    // 동시 도착 방지: 반대편에서 거의 같은 순간에 닿을 공격이 있으면 한 번만 0.3초 미룸
    if (!delayed && kind !== 'good') {
      const mine = this.eta(kind, start, start, speed, false);
      const clash = this.projs.some(
        (p) =>
          !p.dead &&
          p.bounce === undefined &&
          p.kind !== 'good' &&
          Math.abs(wrap(p.base - angle)) > SAFE_ANGLE &&
          Math.abs(this.eta(p.kind, p.dist, p.start, p.speed, p.dashing) - mine) < SAFE_GAP,
      );
      if (clash) {
        this.queue.push({ at: 0.3, kind, base: angle, chain, delayed: true });
        return;
      }
    }

    if (kind === 'slack' && !chain) {
      // 업무 떠넘기기: 3연속
      this.queue.push(
        { at: 0.22, kind, base: angle + deg(8), chain: true, delayed: true },
        { at: 0.44, kind, base: angle - deg(8), chain: true, delayed: true },
      );
    }
    if (!this.seen.has(kind)) {
      this.seen.add(kind);
      this.slowT = 0.8;
      this.tipT = 2.4;
      this.tipText = `NEW ${def.icon} ${def.name} — ${def.tip}`;
      this.cb.onSound('new');
      this.cb.onNewKind?.(kind);
    }
    const pool = this.age >= 50 ? [...def.texts, ...def.lateTexts] : def.texts;
    let hp = kind === 'layoff' ? 2 : 1;
    if (kind === 'layoff' && this.rule === 'layoff2') hp = 3;
    this.projs.push({
      kind,
      text: pick(pool),
      base: angle,
      theta: angle,
      dist: start,
      start,
      speed,
      t: 0,
      phase: Math.random() * TAU,
      hp,
      dashing: false,
      dead: false,
    });
  }

  private launchFinale(angle: number) {
    const start = this.fieldR - 34 * this.s;
    this.projs.push({
      kind: 'layoff',
      text: '마지막 면담',
      base: angle,
      theta: angle,
      dist: start,
      start,
      speed: KINDS.layoff.speed * 1.3 * this.s,
      t: 0,
      phase: 0,
      hp: 3,
      dashing: false,
      dead: false,
      finale: true,
    });
  }

  private moveProj(p: Proj, dt: number) {
    p.t += dt;
    if (p.bounce !== undefined) {
      p.bounce += dt;
      p.dist += 260 * this.s * dt;
      if (p.bounce > 0.35) p.dead = true;
      return;
    }
    let v = p.speed;
    if (p.kind === 'late') {
      if (!p.dashing && p.dist < p.start * DASH_AT) p.dashing = true;
      if (p.dashing) v *= DASH_MUL;
    }
    const prev = p.dist;
    p.dist -= v * dt;
    p.theta = p.base;
    if (p.kind === 'order') {
      const k = Math.max(0, (p.dist - this.leaderR) / (p.start - this.leaderR));
      const sway = this.rule === 'junior' ? 0.8 : 0.55;
      p.theta = p.base + Math.sin(p.t * 3.6 + p.phase) * sway * k;
    }
    if (this.ended) {
      if (p.dist < this.leaderR) p.dead = true;
      return;
    }

    // 방패 판정: 이번 프레임에 판정 구간을 지나쳤는지 (저프레임 터널링 방지)
    const shR = this.shieldR;
    if (p.dist <= shR + 4 * this.s && prev > shR - 14 * this.s) {
      if (this.covered(p.theta)) {
        this.onBlock(p);
        return;
      }
    }
    if (p.dist <= this.leaderR) this.onHit(p);
  }

  private covered(theta: number) {
    // 판정점(작은 원)이 방패에 조금이라도 걸치면 막힌 것
    const tol = (HIT_DOT_R * this.s) / this.shieldR + 0.02;
    if (Math.abs(wrap(theta - this.shield)) <= this.arc / 2 + tol) return true;
    if (this.perks.back && Math.abs(wrap(theta - this.shield - Math.PI)) <= (this.arc * 0.55) / 2 + tol) return true;
    return false;
  }

  private pos(theta: number, dist: number) {
    return { x: this.cx + Math.cos(theta) * dist, y: this.cy + Math.sin(theta) * dist };
  }

  private onBlock(p: Proj) {
    const { x, y } = this.pos(p.theta, p.dist);
    if (p.kind === 'good') {
      p.bounce = 0;
      this.float(x, y, '앗, 내 커피…', '#2a8a45', 13);
      this.cb.onSound('block');
      return;
    }
    p.hp -= 1;
    this.blockFlash = 1;
    this.cb.onBuzz(p.kind === 'layoff' ? 25 : 8);
    this.burst(x, y, KINDS[p.kind].ink === '#ffffff' ? '#888' : KINDS[p.kind].ink, 8);
    if (p.hp > 0) {
      // 희망퇴직: 한 번 밀려났다가 다시 온다
      p.dist = Math.min(p.start, p.dist + 85 * this.s);
      p.speed *= 0.9;
      p.base = p.theta;
      this.shake = 0.35;
      this.float(x, y, p.finale ? pick(['그래도 생각해 봐', '조건 더 줄게', '마지막으로 묻네']) : '아직 안 끝났어요', '#555', 13);
      this.cb.onSound('heavy');
      return;
    }
    p.bounce = 0;
    this.blocked[p.kind] += 1;
    this.streak += 1;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    if (p.kind === 'layoff') {
      this.stopT = 0.07;
      this.shake = 0.9;
    }
    if (p.finale) {
      this.finaleBlocked = true;
      this.finaleDone(true);
      return;
    }
    this.float(x, y, pick(KINDS[p.kind].quips), '#5b4bdb', p.kind === 'layoff' ? 18 : 13);
    if (this.streak % 10 === 0) {
      this.mental = Math.min(this.maxMental, this.mental + 5);
      const name = STREAK_TITLES[this.streak];
      this.float(this.cx, this.cy - 50 * this.s, `${this.streak}연속 방어!${name ? ` ${name}` : ''} 멘탈 +5`, '#0d8a3a', name ? 17 : 15);
      this.cb.onSound(name ? 'fanfare' : 'combo');
      if (name) this.confetti(this.cx, this.cy - 40 * this.s, 24);
      return;
    }
    this.cb.onSound(p.kind === 'layoff' ? 'heavy' : 'block');
  }

  private finaleDone(blocked: boolean) {
    this.finale = 2;
    this.finaleT = 0;
    this.banner(blocked ? '🎉 정년퇴임을 축하합니다!' : '…그래도 버텼다', 2.4);
    this.cb.onSound('fanfare');
    // 팀원들이 동시에 응원을 쏟아낸다
    if (blocked) {
      for (const a of this.avatars) if (a.source === 'member' && this.active(a)) this.launch('good', a.angle, false, true);
      this.confetti(this.cx, this.cy, 40);
    }
  }

  private onHit(p: Proj) {
    p.dead = true;
    const def = KINDS[p.kind];
    if (p.kind === 'good') {
      const heal = Math.round(-def.dmg * (1 + 0.25 * (this.perks.coffee ?? 0)));
      this.mental = Math.min(this.maxMental, this.mental + heal);
      this.hits.good += 1;
      this.float(this.cx, this.cy - 40 * this.s, `멘탈 +${heal}`, '#0d8a3a', 16);
      this.burst(this.cx, this.cy, '#3cc46a', 10);
      this.cb.onSound('heal');
      return;
    }
    let dmg = def.dmg;
    if (p.kind === 'customer') dmg *= Math.pow(0.5, this.perks.mute ?? 0);
    if (def.source === 'member') dmg *= Math.pow(0.75, this.perks.oneonone ?? 0);
    if (def.source === 'boss' || def.source === 'ceo') dmg *= Math.pow(0.7, this.perks.line ?? 0);
    dmg = Math.max(1, Math.round(dmg));
    this.mental -= dmg;
    this.hits[p.kind] += 1;
    this.yearHits += 1;
    this.lastHit = p.kind;
    this.streak = 0;
    this.hurtT = 0.45;
    this.shake = p.kind === 'layoff' ? 1 : 0.5;
    this.float(this.cx, this.cy - 44 * this.s, `${def.icon} 멘탈 -${dmg}`, '#d02a2a', 16);
    this.cb.onSound(p.kind === 'layoff' ? 'heavy' : 'hit');
    this.cb.onBuzz(p.kind === 'layoff' ? 140 : 35);
    if (p.finale && this.mental > 0) this.finaleDone(false);
  }

  private float(x: number, y: number, text: string, color: string, size: number) {
    this.floaters.push({ x, y, text, color, t: 0, life: 1, size });
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = (80 + Math.random() * 140) * this.s;
      this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 0.5, color, g: 0 });
    }
  }

  private confetti(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = (120 + Math.random() * 260) * this.s;
      this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 1.8, color: pick(CONFETTI), g: 420 * this.s });
    }
  }

  // ---------- 그리기 ----------
  draw(ctx: CanvasRenderingContext2D) {
    const { w, h, cx, cy, fieldR, s } = this;
    const C = this.dark
      ? { floor: '#1d1c24', floor2: '#26242f', ring: '#34313f', desk: '#3a3646', text: '#ecebf3', muted: '#9a98a8', bar: '#2d2b36' }
      : { floor: '#f4f1ea', floor2: '#ebe6db', ring: '#ddd6c6', desk: '#c9b896', text: '#1d1d1f', muted: '#76716a', bar: '#e4dfd4' };

    ctx.save();
    ctx.clearRect(0, 0, w, h);
    if (this.shake > 0) {
      const m = this.shake * 7 * s;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    // 바닥
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, fieldR);
    g.addColorStop(0, C.floor);
    g.addColorStop(1, C.floor2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, fieldR, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.ring;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, this.shieldR, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // 피격 붉은 비네트
    if (this.hurtT > 0) {
      ctx.fillStyle = `rgba(230,40,40,${this.hurtT * 0.35})`;
      ctx.beginPath();
      ctx.arc(cx, cy, fieldR, 0, TAU);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 예고 방향 표시: 방패 고리 바로 바깥에 짧은 호 (엄지에 가려도, 소리 없이도 보이게)
    const warnR = this.shieldR + 16 * s;
    const pulse = 0.55 + Math.sin(this.time * 18) * 0.35;
    const warnArc = (ang: number, color: string, wide = 0.32) => {
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = color;
      ctx.lineWidth = 5 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, warnR, ang - wide / 2, ang + wide / 2);
      ctx.stroke();
      ctx.restore();
    };
    for (const a of this.avatars) {
      if (!a.pending || !this.active(a)) continue;
      warnArc(a.angle, a.pending === 'good' ? '#22a04b' : a.pending === 'layoff' ? '#333' : '#e23b3b', a.pending === 'layoff' ? 0.45 : 0.32);
    }
    for (const ph of this.phones) warnArc(ph.angle, '#e23b3b');

    // 공격자
    const avR = fieldR - 20 * s;
    const junior = this.rule === 'junior';
    for (const a of this.avatars) {
      if (!this.active(a)) continue;
      let { x, y } = this.pos(a.angle, avR);
      if (a.pending) {
        x += Math.sin(this.time * 60) * 2.5 * s;
      }
      const isJunior = junior && a.source === 'boss' && !a.only;
      ctx.fillStyle = C.desk;
      roundRect(ctx, x - 20 * s, y - 6 * s, 40 * s, 14 * s, 4 * s);
      ctx.fill();
      ctx.font = `${(a.finale ? 34 : 26) * s}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.fillText(isJunior ? '👩‍🔬' : a.emoji, x, y - 8 * s);
      ctx.font = `600 ${10 * s}px system-ui, sans-serif`;
      ctx.fillStyle = C.muted;
      ctx.fillText(isJunior ? '정상무' : a.name, x, y + 16 * s);
      if (a.pending) {
        // 예고: 종류 아이콘을 띄워 무엇이 올지 미리 보이게
        const big = a.pending === 'layoff';
        const good = a.pending === 'good';
        const r = (big ? 12 : 10.5) * s;
        ctx.fillStyle = good ? '#22a04b' : big ? '#222' : '#e23b3b';
        ctx.beginPath();
        ctx.arc(x + 16 * s, y - 25 * s, r, 0, TAU);
        ctx.fill();
        ctx.font = `${(big ? 13 : 11.5) * s}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        ctx.fillText(good ? '♥' : KINDS[a.pending].icon, x + 16 * s, y - 24.5 * s);
      }
    }

    // 고객 전화 예고
    for (const ph of this.phones) {
      const { x, y } = this.pos(ph.angle, avR);
      const k = 1 + Math.sin(this.time * 40) * 0.12;
      ctx.font = `${24 * s * k}px system-ui, "Apple Color Emoji", sans-serif`;
      ctx.fillText('☎️', x, y);
      ctx.strokeStyle = 'rgba(226,59,59,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 18 * s * (1.4 - ph.t / ph.total), 0, TAU);
      ctx.stroke();
    }

    // 팀장
    const leader =
      this.finale === 2 ? '🥳' : this.hurtT > 0 ? '😵' : this.ended && this.mental <= 0 ? '😵' : this.age >= 55 ? '👴' : this.age >= 50 ? '👨‍💼' : '🧑‍💼';
    ctx.fillStyle = C.desk;
    roundRect(ctx, cx - 30 * s, cy + 10 * s, 60 * s, 16 * s, 5 * s);
    ctx.fill();
    ctx.font = `${40 * s}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.fillText(leader, cx, cy - 2 * s);
    ctx.font = `700 ${10 * s}px system-ui, sans-serif`;
    ctx.fillStyle = C.muted;
    ctx.fillText('팀장', cx, cy + 34 * s);
    if (this.streak >= 3 && !this.ended) {
      ctx.fillStyle = '#5b4bdb';
      ctx.font = `800 ${12 * s}px system-ui, sans-serif`;
      ctx.fillText(`🔥 ${this.streak}연속 방어`, cx, cy + 48 * s);
    }

    // 방패
    if (!(this.ended && this.mental <= 0)) {
      this.drawShield(ctx, this.shield, this.arc, 1);
      if (this.perks.back) this.drawShield(ctx, this.shield + Math.PI, this.arc * 0.55, 0.75);
    }

    // 말풍선
    for (const p of this.projs) this.drawProj(ctx, p);

    // 파티클
    for (const p of this.sparks) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.fillStyle = p.color;
      const sz = (p.g ? 6 : 4) * s;
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, p.g ? sz * 0.6 : sz);
    }
    ctx.globalAlpha = 1;

    // 플로터
    for (const f of this.floaters) {
      ctx.globalAlpha = 1 - f.t / f.life;
      ctx.font = `800 ${f.size * s}px system-ui, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = this.dark ? '#111' : '#fff';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    this.drawHud(ctx, C);

    // 새 공격 소개 / 이벤트 배너 (HUD 바로 아래)
    const pill = (text: string, t: number, y: number, bg: string, ink: string) => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, t / 0.3);
      ctx.font = '800 13px system-ui, sans-serif';
      const tw = Math.min(w - 24, ctx.measureText(text).width + 28);
      ctx.fillStyle = bg;
      roundRect(ctx, cx - tw / 2, y, tw, 30, 15);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fitText(ctx, text, cx, y + 15.5, tw - 20);
      ctx.restore();
    };
    if (this.tipT > 0 && !this.ended) pill(this.tipText, this.tipT, 80, '#5b4bdb', '#fff');
    if (this.bannerT > 0) pill(this.bannerText, this.bannerT, this.tipT > 0 ? 116 : 80, this.dark ? '#ecebf3' : '#1d1d1f', this.dark ? '#1d1d1f' : '#fff');

    // 연도 인트로 배너
    if (this.introT > 0 && !this.ended) {
      const a = Math.min(1, this.introT / 0.4, (2.2 - this.introT) / 0.3);
      const info = yearInfo(this.age);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = this.dark ? 'rgba(20,19,26,0.92)' : 'rgba(255,255,255,0.94)';
      const bw = Math.min(w - 32, 340);
      const shrunk = this.yearIndex > 0 && SHIELD_BASE_DEG - SHIELD_SHRINK_DEG * (this.yearIndex - 1) > SHIELD_MIN_DEG;
      roundRect(ctx, cx - bw / 2, cy - 62, bw, shrunk ? 140 : 118, 18);
      ctx.fill();
      if (shrunk) {
        ctx.fillStyle = '#d14b4b';
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🛡️ 방패가 조금 좁아졌어요 (${Math.round((this.arc * 180) / Math.PI)}°) — 빨간 점을 막으세요`, cx, cy + 66);
      }
      ctx.fillStyle = '#5b4bdb';
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.age}세 · ${this.yearIndex + 1}년차 팀장${info.rule ? ' · ⚠️ 특별 규칙' : ''}`, cx, cy - 34);
      ctx.fillStyle = C.text;
      ctx.font = '800 26px system-ui, sans-serif';
      ctx.fillText(info.title, cx, cy - 4);
      ctx.fillStyle = C.muted;
      ctx.font = '500 13px system-ui, sans-serif';
      wrapText(ctx, info.desc, cx, cy + 26, bw - 32, 17);
      ctx.globalAlpha = 1;
    }
  }

  private drawShield(ctx: CanvasRenderingContext2D, ang: number, arc: number, alpha: number) {
    const { cx, cy, s } = this;
    const r = this.shieldR;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    if (this.blockFlash > 0) {
      ctx.strokeStyle = `rgba(157,146,255,${this.blockFlash * 0.6})`;
      ctx.lineWidth = 22 * s;
      ctx.beginPath();
      ctx.arc(cx, cy, r, ang - arc / 2, ang + arc / 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#4a3cc9';
    ctx.lineWidth = 12 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, r, ang - arc / 2, ang + arc / 2);
    ctx.stroke();
    ctx.strokeStyle = '#8f83ff';
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1 * s, ang - arc / 2 + 0.04, ang + arc / 2 - 0.04);
    ctx.stroke();
    ctx.restore();
  }

  private drawProj(ctx: CanvasRenderingContext2D, p: Proj) {
    const def = KINDS[p.kind];
    const { s } = this;
    const { x, y } = this.pos(p.theta, p.dist);
    const big = p.kind === 'layoff';
    const fs = (p.finale ? 15 : big ? 13 : 11.5) * s;
    ctx.font = `700 ${fs}px system-ui, sans-serif`;
    const label = p.kind === 'good' ? p.text : `${def.icon} ${p.text}`;
    p.w ??= ctx.measureText(label).width;
    const bw = p.w + 14 * s;
    const bh = fs + (big ? 14 : 10) * s;
    const dotR = HIT_DOT_R * s * (big ? 1.25 : 1);
    // 설명 말풍선은 판정점 옆(날아오는 방향과 수직)에 딱 붙인다 — 진행 방향을 가리지 않게
    const ux = -Math.sin(p.theta);
    const uy = Math.cos(p.theta);
    const half = Math.abs(ux) * (bw / 2) + Math.abs(uy) * (bh / 2);
    const off = dotR + 3 * s + half;
    // 화면 밖으로 나가면 반대쪽 옆으로
    let side = 1;
    const lx = x + ux * off;
    if (lx - bw / 2 < 4 || lx + bw / 2 > this.w - 4) side = -1;
    ctx.save();
    if (p.bounce !== undefined) ctx.globalAlpha = Math.max(0, 1 - p.bounce / 0.35);
    ctx.translate(x, y);
    if (p.kind === 'late' && p.dashing) ctx.rotate(Math.sin(p.t * 30) * 0.08);

    // 말풍선 (판정 없음 — 보기용)
    ctx.save();
    ctx.translate(ux * off * side, uy * off * side);
    if (big) ctx.scale(1 + Math.sin(p.t * 6) * 0.04, 1 + Math.sin(p.t * 6) * 0.04);
    ctx.globalAlpha *= 0.92;
    ctx.fillStyle = def.fill;
    ctx.strokeStyle = def.ink;
    ctx.lineWidth = big ? 2 : 1.2;
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = def.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0.5);
    ctx.restore();

    // 판정점: 이 작은 원을 방패로 막으면 된다
    const pulse = 1 + Math.sin(p.t * 10) * 0.12;
    const good = p.kind === 'good';
    ctx.beginPath();
    ctx.arc(0, 0, dotR * 1.9 * pulse, 0, TAU);
    ctx.fillStyle = good ? 'rgba(60,196,106,0.25)' : 'rgba(255,60,60,0.22)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, dotR, 0, TAU);
    ctx.fillStyle = good ? '#2fb35a' : '#ff3b3b';
    ctx.fill();
    ctx.lineWidth = 2 * s;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    // 남은 체력만큼 판정점 둘레에 붉은 고리
    for (let i = 1; i < p.hp; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, dotR + (3 + 3.5 * i) * s, 0, TAU);
      ctx.strokeStyle = '#ff5a5a';
      ctx.lineWidth = 1.8 * s;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHud(ctx: CanvasRenderingContext2D, C: Record<string, string>) {
    const { w } = this;
    const pad = 16;
    const right = w - pad - 84; // 소리·일시정지 버튼 자리
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.text;
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText(`${this.age}세`, pad, 30);
    const ageW = ctx.measureText(`${this.age}세`).width;
    ctx.fillStyle = C.muted;
    ctx.font = '600 13px system-ui, sans-serif';
    fitText(ctx, `· ${yearInfo(this.age).title} · 정년까지 ${RETIRE_AGE - this.age}년`, pad + ageW + 6, 30, right - pad - ageW - 6);

    // 연도 진행
    const yw = right - pad;
    ctx.fillStyle = C.bar;
    roundRect(ctx, pad, 38, yw, 4, 2);
    ctx.fill();
    ctx.fillStyle = '#5b4bdb';
    roundRect(ctx, pad, 38, yw * Math.min(1, this.yearT / YEAR_LEN), 4, 2);
    ctx.fill();

    // 멘탈
    const ratio = Math.max(0, this.mental / this.maxMental);
    ctx.fillStyle = C.bar;
    roundRect(ctx, pad, 50, yw, 14, 7);
    ctx.fill();
    ctx.fillStyle = ratio > 0.5 ? '#3cc46a' : ratio > 0.25 ? '#f0a020' : '#e23b3b';
    roundRect(ctx, pad, 50, Math.max(14, yw * ratio), 14, 7);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.fillText(`멘탈 ${Math.ceil(this.mental)} / ${this.maxMental}`, pad + 8, 61);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 폭을 넘으면 말줄임 */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number) {
  if (maxW <= 0) return;
  let t = text;
  if (ctx.measureText(t).width > maxW) {
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    t += '…';
  }
  ctx.fillText(t, x, y);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lh;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}
