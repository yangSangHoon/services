/** 커리어 로드맵 — 레벨별 칭호·범위·승급 조건·보상. 밸런스 수치는 여기서만 조정한다. */

export interface LevelMeta {
  level: number;
  rank: string; // 칭호
  emoji: string;
  title: string; // 학습 범위 이름
  topics: string[];
  xpToExam: number; // 이 레벨에서 모아야 승급 시험이 열리는 XP
  reward: { coins: number; item?: string; message: string };
}

export const LEVELS: LevelMeta[] = [
  { level: 1, rank: 'Java 지망생', emoji: '🥚', title: '기초 문법', topics: ['JVM', '변수·자료형', '형변환', '제어문', '배열', 'String'], xpToExam: 150,
    reward: { coins: 100, item: 'hat-cap', message: 'Hello, World! 를 넘어섰어요. 이제 객체의 세계로!' } },
  { level: 2, rank: '입문 개발자', emoji: '🐣', title: '객체지향', topics: ['클래스·객체', '캡슐화', '상속', '다형성', '인터페이스'], xpToExam: 200,
    reward: { coins: 150, item: 'pet-duck', message: '객체지향 4대 특징을 설명할 수 있게 됐어요. 러버덕이 디버깅을 도와줄 거예요.' } },
  { level: 3, rank: '자바 견습생', emoji: '🐥', title: '핵심 API', topics: ['컬렉션', '제네릭', '예외', 'equals·hashCode', 'enum'], xpToExam: 250,
    reward: { coins: 200, item: 'outfit-hoodie', message: '컬렉션과 예외를 다룰 줄 알면 코딩테스트도 할 만해요.' } },
  { level: 4, rank: '데이터 탐험가', emoji: '🔎', title: 'SQL과 DB 기초', topics: ['SELECT', 'JOIN', 'GROUP BY', '인덱스', '트랜잭션'], xpToExam: 300,
    reward: { coins: 250, item: 'hat-headset', message: '데이터를 직접 꺼내 볼 수 있게 됐어요. 실무실 SQL 미션이 더 열려요!' } },
  { level: 5, rank: '모던 자바 마스터', emoji: '⚡', title: '모던 자바', topics: ['람다', 'Stream', 'Optional', 'record', '동시성 기초'], xpToExam: 300,
    reward: { coins: 300, item: 'pet-cat', message: '스트림으로 우아하게! 이제 Spring 을 배울 준비가 됐어요.' } },
  { level: 6, rank: '신입 백엔드', emoji: '🌱', title: 'Spring 핵심', topics: ['IoC·DI', 'Bean', 'AOP', 'Spring MVC', 'REST'], xpToExam: 350,
    reward: { coins: 350, item: 'outfit-shirt', message: '축하해요, 신입 백엔드 개발자로 입사했어요! 사원증이 발급됐어요.' } },
  { level: 7, rank: '주니어 백엔드', emoji: '🌿', title: 'JPA와 트랜잭션', topics: ['영속성 컨텍스트', '연관관계', 'N+1', '@Transactional', '격리수준'], xpToExam: 400,
    reward: { coins: 400, item: 'hat-beanie', message: 'N+1 을 잡아내는 주니어! 사수가 코드리뷰에서 칭찬했어요.' } },
  { level: 8, rank: '실무 개발자', emoji: '🛠️', title: '협업과 운영', topics: ['HTTP·REST', 'Git', '테스트', '로깅', 'CI/CD'], xpToExam: 450,
    reward: { coins: 450, item: 'pet-robot', message: '테스트·리뷰·배포까지 혼자서도 척척. 믿고 맡기는 동료가 됐어요.' } },
  { level: 9, rank: '시니어 개발자', emoji: '🌳', title: '성능과 깊이', topics: ['JVM·GC', '동시성 심화', '캐시', 'DB 성능', '메시지 큐'], xpToExam: 500,
    reward: { coins: 500, item: 'outfit-suit', message: '장애 상황에서도 침착하게 원인을 찾는 시니어가 됐어요.' } },
  { level: 10, rank: '소프트웨어 아키텍트', emoji: '🏛️', title: '설계와 시스템', topics: ['디자인 패턴', 'DDD', 'MSA', '장애 대응', '시스템 설계'], xpToExam: 550,
    reward: { coins: 1000, item: 'hat-crown', message: '지망생에서 아키텍트까지! 이제 당신이 누군가의 멘토예요. 🎉' } },
];

/** 레벨 10 시험까지 통과하면 도달하는 마지막 단계 */
export const MAX_LEVEL = 11;
export const GRADUATE = { rank: '전설의 멘토', emoji: '🐉' };

export const levelMeta = (lv: number) => LEVELS[Math.min(lv, LEVELS.length) - 1];
export const rankOf = (lv: number) => (lv >= MAX_LEVEL ? GRADUATE : levelMeta(lv));

/** XP·코인 지급 규칙 */
export const RULES = {
  lessonXp: 25, // 레슨 처음 완독
  quizFirstCorrectXp: 10, // 문제 첫 정답
  quizRepeatXp: 2, // 이미 맞힌 문제 다시 맞힘
  wrongNoteClearXp: 8, // 오답노트 문제 맞혀서 졸업
  sqlMissionXp: 40,
  sqlMissionCoins: 30,
  dailyBonusXp: 30,
  dailyBonusCoins: 50,
  dailyCount: 5,
  examSize: 10,
  examReviewSize: 2, // 시험에 섞이는 이전 레벨 복습 문제
  examPassRate: 0.7,
  examPassCoins: 0, // 보상은 LEVELS[].reward 로
  interviewSize: 10,
  interviewMinLevel: 3,
  correctCoins: 3, // 정답 1개당 코인
};
