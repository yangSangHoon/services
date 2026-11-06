import { useState } from 'react';
import { ITEMS, type Slot } from '../data/shop';
import { buy, equip, type Save } from '../store';
import { sfx } from '../sound';
import { Avatar } from './Avatar';
import { Room, Tabs } from './Room';

const SLOTS: { id: Slot; label: string }[] = [
  { id: 'hat', label: '🧢 모자' },
  { id: 'outfit', label: '👕 옷' },
  { id: 'pet', label: '🐾 펫' },
  { id: 'desk', label: '🪴 책상' },
];

export function Shop({ save, onClose }: { save: Save; onClose: () => void }) {
  const [slot, setSlot] = useState<Slot>('hat');
  const [msg, setMsg] = useState('');
  const items = ITEMS.filter((i) => i.slot === slot);

  return (
    <Room emoji="🛍️" title="굿즈샵" sub="코인으로 아바타를 꾸며요. 정답·미션·출석으로 코인이 쌓여요." color="#d6457a" onClose={onClose} actions={<span className="coin-pill">🪙 {save.coins}</span>}>
      <div className="shop-preview">
        <Avatar save={save} size={2.4} />
      </div>
      <Tabs value={slot} onChange={setSlot} tabs={SLOTS} />
      {msg && <p className="bad-text small center">{msg}</p>}
      <div className="shop-grid">
        {items.map((it) => {
          const owned = save.owned.includes(it.id);
          const on = save.equipped[it.slot] === it.id;
          return (
            <div key={it.id} className={`shop-item ${on ? 'on' : ''}`}>
              <span className="shop-emoji">{it.emoji}</span>
              <strong className="small">{it.name}</strong>
              <span className="muted tiny">{it.desc}</span>
              {owned ? (
                <button className="btn small-btn" onClick={() => equip(it.slot, on ? null : it.id)}>{on ? '벗기' : '착용'}</button>
              ) : it.price > 0 ? (
                <button
                  className="btn primary small-btn"
                  disabled={save.level < it.minLevel}
                  onClick={() => {
                    const err = buy(it.id);
                    setMsg(err ?? '');
                    if (!err) sfx('coin');
                  }}
                >
                  {save.level < it.minLevel ? `🔒 Lv.${it.minLevel}` : `🪙 ${it.price}`}
                </button>
              ) : (
                <span className="muted tiny">승급 보상 전용</span>
              )}
            </div>
          );
        })}
      </div>
    </Room>
  );
}
