import { useMemo, useState } from 'react';
import { ALL_QUESTIONS } from '../content';
import { RULES } from '../data/levels';
import { finishDaily, today, type Save } from '../store';
import { hashStr, mulberry32, shuffle } from '../util';
import { Quiz } from './Quiz';
import { Room } from './Room';

const JAVA_TIPS = [
  '☕ Java 라는 이름은 개발자들이 즐겨 마시던 인도네시아 자바섬 커피에서 왔대요.',
  '🧵 String 은 불변이라 반복문에서 + 로 이어 붙이면 객체가 계속 생겨요. StringBuilder 를 쓰세요.',
  '🧭 equals 를 재정의하면 hashCode 도 반드시 재정의! HashMap 이 고마워할 거예요.',
  '🧪 테스트 이름은 한국어로 써도 돼요. `@DisplayName("재고가 없으면 주문이 실패한다")`',
  '🐢 목록 API가 느리면 가장 먼저 N+1 쿼리를 의심해 보세요.',
  '🔒 SQL 은 문자열 더하기 말고 PreparedStatement 로! SQL Injection 은 지금도 현역이에요.',
  '🌱 생성자 주입 + final 필드 조합이면 순환 참조도 빨리 발견하고 테스트도 쉬워져요.',
  '📦 Optional 은 반환 타입에만. 필드나 파라미터로 쓰지 않는 게 관례예요.',
  '🧯 장애 대응 1순위는 원인 분석이 아니라 서비스 복구(롤백)예요.',
  '📝 커밋 메시지는 “무엇을”보다 “왜”를 적으면 6개월 뒤의 내가 고마워해요.',
];

export function Cafe({ save, onClose }: { save: Save; onClose: () => void }) {
  const t = today();
  const doneToday = save.dailyDone === t;
  const cur = Math.min(save.level, 10);
  const [playing, setPlaying] = useState(false);
  const daily = useMemo(() => {
    const rand = mulberry32(hashStr(`${t}:${cur}`));
    return shuffle(ALL_QUESTIONS.filter((q) => q.level <= cur), rand).slice(0, RULES.dailyCount);
  }, [t, cur]);
  const tip = JAVA_TIPS[hashStr(t) % JAVA_TIPS.length];

  if (playing) {
    return (
      <Room emoji="☕" title="자바 카페" color="#ecc9a6" onClose={() => setPlaying(false)}>
        <Quiz
          questions={daily}
          mode="daily"
          feedback="instant"
          title={`오늘의 퀴즈 · ${t}`}
          onDone={() => finishDaily()}
          onClose={() => setPlaying(false)}
          result={() => (
            <p className="center">{doneToday ? '오늘 보너스는 이미 받았어요. 내일 또 와요!' : `☕ 출석 보너스 +${RULES.dailyBonusXp} XP · +${RULES.dailyBonusCoins} 🪙`}</p>
          )}
        />
      </Room>
    );
  }

  return (
    <Room emoji="☕" title="자바 카페" sub="하루 한 잔, 하루 다섯 문제. 매일 오면 출석 스트릭이 쌓여요." color="#ecc9a6" onClose={onClose}>
      <div className="barista">
        <span className="barista-emoji">🧑‍🍳</span>
        <div className="bubble-static">
          {doneToday ? '오늘 퀴즈 완료! 내일 새 문제가 나와요. 복습 삼아 다시 풀어도 돼요.' : '어서 와요! 오늘의 퀴즈 다섯 문제 풀고 보너스 받아 가요.'}
        </div>
      </div>
      <div className="stat-row">
        <div className="stat"><span className="stat-v">🔥 {save.streak.count}</span><span className="muted small">연속 출석</span></div>
        <div className="stat"><span className="stat-v">🏅 {save.streak.best}</span><span className="muted small">최고 기록</span></div>
        <div className="stat"><span className="stat-v">{doneToday ? '✅' : '⬜'}</span><span className="muted small">오늘 퀴즈</span></div>
      </div>
      <button className="btn primary wide" onClick={() => setPlaying(true)}>
        {doneToday ? '오늘의 퀴즈 다시 풀기' : `☕ 오늘의 퀴즈 (+${RULES.dailyBonusXp} XP · +${RULES.dailyBonusCoins} 🪙)`}
      </button>
      <div className="tip">{tip}</div>
    </Room>
  );
}
