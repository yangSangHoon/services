import { useState, type CSSProperties } from 'react';
import { HONESTY } from '../lib/dreamMeta';
import { formatCoins, timeAgo } from '../lib/format';
import type { Dream } from '../lib/types';
import { PASTELS } from './Backdrops';

interface Props {
  dream: Dream;
  index: number;
  isMine: boolean;
  guest: boolean;
  vanishing: boolean;
  fresh: boolean;
  highlighted: boolean;
  onBuy: (d: Dream) => void;
}

const POOFS = ['뿅! 증발', '낚아챔!', '슝~ 사라짐'];
// 증발할 때 올라가는 파스텔 방울 22개 (위치는 한 번만 정함)
const BUBBLES = Array.from({ length: 22 }, (_, i) => {
  const s = 10 + Math.random() * 18;
  return {
    left: `${8 + Math.random() * 80}%`,
    top: `${15 + Math.random() * 70}%`,
    width: s,
    height: s,
    background: PASTELS[i % PASTELS.length],
    animationDelay: `${(Math.random() * 0.45).toFixed(2)}s`,
  } as CSSProperties;
});

export default function DreamCard({ dream, index, isMine, guest, vanishing, fresh, highlighted, onBuy }: Props) {
  const [open, setOpen] = useState(false);
  const [poof] = useState(() => POOFS[Math.floor(Math.random() * POOFS.length)]);
  const honesty = HONESTY[dream.honesty];
  const free = dream.price === 0;
  const price = formatCoins(dream.price);

  return (
    <article className={`cell ${fresh ? 'fresh' : ''}`}>
      <div className={`card ${vanishing ? 'vanish' : highlighted ? 'hi' : ''}`}>
        <div className="card-top">
          <span className="badge" style={{ background: honesty.tint, animationDelay: `${(index % 5) * 0.7}s` }}>
            {honesty.emoji} {honesty.label}
          </span>
        </div>
        <div>
          <h3>{dream.title}</h3>
          {dream.teaser && <p className="teaser">“{dream.teaser}”</p>}
        </div>
        {dream.content && (
          <button className={`card-content ${open ? 'open' : ''}`} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <span>{dream.content}</span>
            <small>{open ? '접기 ▴' : '펼쳐 읽기 ▾'}</small>
          </button>
        )}
        <div className="card-foot">
          <span className="who">
            {dream.seller_nickname}
            <br />
            <span>{timeAgo(dream.created_at)}</span>
          </span>
          {isMine ? (
            <span className="buy-mine">내 꿈 · {free ? '무료' : price}</span>
          ) : free ? (
            <button className="btn buy buy-free" disabled={vanishing} onClick={() => onBuy(dream)}>
              🎁 무료
            </button>
          ) : guest ? (
            <button className="btn buy buy-locked" disabled={vanishing} onClick={() => onBuy(dream)}>
              🔐 {price} · 가입하고 사기
            </button>
          ) : (
            <button className="btn buy buy-paid" disabled={vanishing} onClick={() => onBuy(dream)}>
              <span className="coin">꿈</span>
              {price}
            </button>
          )}
        </div>
      </div>
      {vanishing && (
        <div className="poof-layer">
          {BUBBLES.map((style, i) => (
            <i key={i} style={style} />
          ))}
          <div className="poof">{poof}</div>
        </div>
      )}
    </article>
  );
}
