import { useState } from 'react';
import { HONESTY, kindMeta } from '../lib/dreamMeta';
import { formatPrice, timeAgo } from '../lib/format';
import type { Dream } from '../lib/types';

interface Props {
  dream: Dream;
  index: number;
  isMine: boolean;
  vanishing: boolean;
  onBuy: (d: Dream) => void;
}

export default function DreamCard({ dream, index, isMine, vanishing, onBuy }: Props) {
  const [expanded, setExpanded] = useState(false);
  const kind = kindMeta(dream.kind);
  const honesty = HONESTY[dream.honesty];
  return (
    <article
      className={`dream-card kind-${dream.kind ?? 'none'} ${vanishing ? 'vanish' : ''}`}
      style={{ animationDelay: `${(index % 6) * -0.7}s` }}
    >
      <div className="card-top">
        <span className="kind-emoji">{kind.emoji}</span>
        <div className="badges">
          {dream.kind && <span className="badge">{kind.label}</span>}
          <span className={`badge honesty-${dream.honesty}`}>
            {honesty.emoji} {honesty.label}
          </span>
        </div>
      </div>
      <h3>{dream.title}</h3>
      {dream.teaser && <p className="teaser">“{dream.teaser}”</p>}
      {dream.content && (
        <p className={`card-content ${expanded ? 'expanded' : ''}`} onClick={() => setExpanded((v) => !v)}>
          {dream.content}
        </p>
      )}
      <footer className="card-foot">
        <span className="muted small">
          {dream.seller_nickname} · {timeAgo(dream.created_at)}
        </span>
        <button className={`btn-buy ${dream.price === 0 ? 'free' : ''}`} disabled={isMine || vanishing} onClick={() => onBuy(dream)}>
          {isMine ? '내 꿈' : formatPrice(dream.price)}
        </button>
      </footer>
    </article>
  );
}
