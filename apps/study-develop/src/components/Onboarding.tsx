import { useState } from 'react';
import { setProfile } from '../store';

export const AVATARS = ['🧑‍💻', '👩‍💻', '👨‍💻', '🧑‍🎓', '🦊', '🐼', '🐧', '🐱', '🐻', '🦁'];

export function Onboarding() {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [step, setStep] = useState(0);

  return (
    <div className="room-backdrop">
      <section className="onboard">
        {step === 0 ? (
          <>
            <div className="hero-emoji">☕</div>
            <h1>자바 개발자 키우기</h1>
            <p>
              자바 캠퍼스에 오신 걸 환영해요!<br />
              <strong>공부방</strong>에서 배우고, <strong>시험장</strong>에서 승급하고,<br />
              <strong>실무실</strong>에서 진짜 SQL을 날려 보세요.
            </p>
            <ul className="onboard-steps">
              <li>🥚 Java 지망생 → 🏛️ 아키텍트까지 10단계</li>
              <li>📖 레슨 40여 개 · ✏️ 문제 180개 · 🗄️ SQL 미션 20개</li>
              <li>🎁 승급하면 코인·아바타 아이템 보상</li>
            </ul>
            <button className="btn primary wide" onClick={() => setStep(1)}>시작하기</button>
          </>
        ) : (
          <>
            <h2>캐릭터 만들기</h2>
            <div className="avatar-big">{avatar}</div>
            <div className="avatar-pick">
              {AVATARS.map((a) => (
                <button key={a} className={`avatar-opt ${avatar === a ? 'on' : ''}`} onClick={() => setAvatar(a)}>{a}</button>
              ))}
            </div>
            <input
              className="input"
              placeholder="이름 (최대 12자)"
              value={name}
              maxLength={12}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setProfile(name, avatar)}
            />
            <button className="btn primary wide" onClick={() => setProfile(name, avatar)}>캠퍼스 입장 🚪</button>
            <p className="muted tiny">PC: 방향키/WASD로 이동 · 모바일: 가고 싶은 곳을 탭</p>
          </>
        )}
      </section>
    </div>
  );
}
