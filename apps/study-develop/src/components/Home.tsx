import { useState } from 'react';
import { CONTENT, SQL_MISSIONS } from '../content';
import { BADGES } from '../data/badges';
import { LEVELS, rankOf } from '../data/levels';
import { resetAll, setProfile, type Save } from '../store';
import { muted, setMuted } from '../sound';
import { pct } from '../util';
import { Avatar } from './Avatar';
import { AVATARS } from './Onboarding';
import { Room } from './Room';

export function Home({ save, onClose }: { save: Save; onClose: () => void }) {
  const [name, setName] = useState(save.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const [mute, setMute] = useState(muted);
  const rank = rankOf(save.level);
  const answered = Object.values(save.answers);
  const totalTry = answered.reduce((a, r) => a + r.correct + r.wrong, 0);
  const totalOk = answered.reduce((a, r) => a + r.correct, 0);

  return (
    <Room emoji="🏠" title="내 방" sub="프로필 · 학습 통계 · 배지" color="#4a8fa8" onClose={onClose}>
      <div className="profile">
        <Avatar save={save} size={2.6} />
        <div>
          <h3>{save.name}</h3>
          <p>{rank.emoji} {rank.rank} · Lv.{Math.min(save.level, 10)}</p>
          <p className="muted small">누적 {save.totalXp} XP · 🪙 {save.coins}</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat"><span className="stat-v">{save.lessonsRead.length}</span><span className="muted small">완독 레슨</span></div>
        <div className="stat"><span className="stat-v">{answered.filter((a) => a.correct).length}</span><span className="muted small">맞힌 문제</span></div>
        <div className="stat"><span className="stat-v">{pct(totalOk, totalTry)}%</span><span className="muted small">정답률</span></div>
        <div className="stat"><span className="stat-v">{save.sqlSolved.length}/{SQL_MISSIONS.length}</span><span className="muted small">SQL 미션</span></div>
      </div>

      <h3 className="section-title">📊 레벨별 숙련도</h3>
      <div className="mastery">
        {CONTENT.map((c, i) => {
          const ok = c.questions.filter((q) => save.answers[q.id]?.correct).length;
          const p = pct(ok, c.questions.length);
          return (
            <div key={i} className={`mastery-row ${i + 1 > save.level ? 'locked' : ''}`}>
              <span className="small">{LEVELS[i].emoji} {LEVELS[i].title}</span>
              <div className="mbar"><div style={{ width: `${p}%` }} /></div>
              <span className="small mono">{p}%</span>
            </div>
          );
        })}
      </div>

      <h3 className="section-title">🏅 배지 {save.badges.length}/{BADGES.length}</h3>
      <div className="badges">
        {BADGES.map((b) => {
          const has = save.badges.includes(b.id);
          return (
            <div key={b.id} className={`badge ${has ? 'has' : ''}`} title={b.desc}>
              <span className="badge-emoji">{has ? b.emoji : '❔'}</span>
              <strong className="tiny">{b.name}</strong>
              <span className="muted tiny">{b.desc}</span>
            </div>
          );
        })}
      </div>

      <h3 className="section-title">⚙️ 설정</h3>
      <div className="settings">
        <label className="small">이름</label>
        <div className="row">
          <input className="input" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} />
          <button className="btn" onClick={() => setProfile(name, save.avatar)}>저장</button>
        </div>
        <label className="small">캐릭터</label>
        <div className="avatar-pick">
          {AVATARS.map((a) => (
            <button key={a} className={`avatar-opt ${save.avatar === a ? 'on' : ''}`} onClick={() => setProfile(save.name, a)}>{a}</button>
          ))}
        </div>
        <button className="btn ghost" onClick={() => { setMuted(!mute); setMute(!mute); }}>{mute ? '🔇 효과음 꺼짐' : '🔊 효과음 켜짐'}</button>
        {confirmReset ? (
          <div className="row">
            <span className="bad-text small">정말 모든 기록을 지울까요?</span>
            <button className="btn danger" onClick={() => { resetAll(); onClose(); }}>지우기</button>
            <button className="btn ghost" onClick={() => setConfirmReset(false)}>취소</button>
          </div>
        ) : (
          <button className="btn ghost danger-text" onClick={() => setConfirmReset(true)}>처음부터 다시 하기</button>
        )}
        <p className="muted tiny">진행 기록은 이 브라우저에만 저장돼요.</p>
      </div>
    </Room>
  );
}
