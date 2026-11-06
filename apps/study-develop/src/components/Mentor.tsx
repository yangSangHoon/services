import { lessonsOf } from '../content';
import { levelMeta, MAX_LEVEL } from '../data/levels';
import type { RoomId } from '../data/world';
import { examReady, today, type Save } from '../store';

const TIPS = [
  '모르는 건 부끄러운 게 아니에요. 모르는 걸 아는 척하는 게 위험하죠.',
  '에러 메시지는 적이 아니라 친구예요. 스택트레이스 맨 위부터 천천히 읽어 봐요.',
  '코드는 한 번 쓰고 열 번 읽혀요. 읽기 좋은 이름이 최고의 주석이에요.',
  '“일단 돌아가게” 만들고, 테스트로 지킨 다음, 깔끔하게 고치세요.',
  '면접에서 모르면 “모르지만 이렇게 찾아보겠다”고 말하는 게 정답이에요.',
  'SQL 은 머리로만 보지 말고 실무실 놀이터에서 꼭 직접 날려 보세요.',
];

/** 멘토가 지금 상태를 보고 다음 할 일을 추천 */
export function nextStep(save: Save): { text: string; room?: RoomId; cta?: string } {
  if (save.pendingRewards.length) return { text: '승급 축하해요! 보상함에 선물이 도착해 있어요 🎁', room: 'reward', cta: '보상함으로' };
  if (save.level >= MAX_LEVEL) return { text: '이제 당신이 멘토예요. 모의면접과 SQL 미션으로 감을 유지해요!', room: 'exam', cta: '시험장으로' };
  if (examReady(save)) return { text: `XP 를 다 모았네요! Lv.${save.level} 승급 시험을 볼 수 있어요. 70% 이상이면 합격!`, room: 'exam', cta: '시험 보러 가기' };
  if (save.dailyDone !== today()) return { text: '오늘의 퀴즈는 풀었나요? 카페에서 5문제 풀면 보너스 XP와 코인을 줘요 ☕', room: 'cafe', cta: '카페로' };
  const unread = lessonsOf(save.level).find((l) => !save.lessonsRead.includes(l.id));
  if (unread) return { text: `공부방에서 “${unread.title}” 레슨을 읽어 볼까요? 시험 범위예요.`, room: 'study', cta: '공부방으로' };
  if (save.wrongNote.length >= 5) return { text: `오답노트에 ${save.wrongNote.length}문제가 쌓였어요. 복습하면 보너스 XP!`, room: 'study', cta: '복습하러' };
  const left = levelMeta(save.level).xpToExam - save.xp;
  return { text: `승급 시험까지 ${left} XP 남았어요. 시험장 연습문제나 실무실 SQL 미션으로 채워 봐요!`, room: 'exam', cta: '연습하러' };
}

export function MentorDialog({ save, onGo, onClose }: { save: Save; onGo: (r: RoomId) => void; onClose: () => void }) {
  const step = nextStep(save);
  const tip = TIPS[Math.floor(Date.now() / 60000) % TIPS.length];
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-who">🧑‍🏫 김멘토 <span className="muted small">15년차 자바 개발자</span></div>
        <p>{save.name}님, {step.text}</p>
        <p className="muted small">“{tip}”</p>
        <div className="row end">
          <button className="btn ghost" onClick={onClose}>닫기</button>
          {step.room && <button className="btn primary" onClick={() => onGo(step.room!)}>{step.cta}</button>}
        </div>
      </div>
    </div>
  );
}
