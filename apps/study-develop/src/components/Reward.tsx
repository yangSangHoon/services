import { useState } from 'react';
import { LEVELS } from '../data/levels';
import { itemById } from '../data/shop';
import { claimReward, type Save } from '../store';
import { sfx } from '../sound';
import { Room } from './Room';

export function Reward({ save, onClose }: { save: Save; onClose: () => void }) {
  const [opened, setOpened] = useState<number | null>(null);
  const claimed = LEVELS.filter((m) => m.level < save.level && !save.pendingRewards.includes(m.level));

  const open = (lv: number) => {
    setOpened(lv);
    sfx('levelup');
    setTimeout(() => sfx('coin'), 500);
    claimReward(lv);
  };

  const shown = opened ? LEVELS[opened - 1] : null;
  const item = shown?.reward.item ? itemById(shown.reward.item) : undefined;

  return (
    <Room emoji="🎁" title="보상함" sub="승급 시험에 합격하면 여기로 선물이 와요" color="#ffe08a" onClose={onClose}>
      {shown && (
        <div className="reveal">
          <div className="reveal-burst">🎉</div>
          <h3>Lv.{shown.level} 졸업 보상</h3>
          <div className="reveal-items">
            <div className="reveal-item"><span>🪙</span>{shown.reward.coins} 코인</div>
            {item && <div className="reveal-item"><span>{item.emoji}</span>{item.name}</div>}
          </div>
          <p>{shown.reward.message}</p>
          {item && <p className="muted small">아이템은 자동으로 착용됐어요. 굿즈샵에서 바꿀 수 있어요.</p>}
          <button className="btn primary" onClick={() => setOpened(null)}>좋아요!</button>
        </div>
      )}
      {!shown && save.pendingRewards.length === 0 && (
        <div className="empty">
          <div className="empty-emoji">📦</div>
          <p>아직 받을 보상이 없어요.<br />시험장에서 승급 시험에 합격하면 선물 상자가 도착해요!</p>
        </div>
      )}
      {!shown && (
        <div className="chests">
          {save.pendingRewards.map((lv) => (
            <button key={lv} className="chest" onClick={() => open(lv)}>
              <span className="chest-emoji">🎁</span>
              <span>Lv.{lv} 승급 선물</span>
              <span className="muted small">눌러서 열기</span>
            </button>
          ))}
        </div>
      )}
      {claimed.length > 0 && (
        <>
          <h3 className="section-title">받은 보상</h3>
          <ul className="history">
            {claimed.map((m) => {
              const it = m.reward.item ? itemById(m.reward.item) : undefined;
              return (
                <li key={m.level}>
                  <span>Lv.{m.level} {m.rank}</span>
                  <span>🪙{m.reward.coins}</span>
                  <span>{it?.emoji}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Room>
  );
}
