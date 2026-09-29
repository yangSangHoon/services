import { useState, type CSSProperties } from 'react';
import { HONESTY, REVIEW_VERDICTS } from '../lib/dreamMeta';
import { formatCoins, timeAgo } from '../lib/format';
import type { Dream, Verdict } from '../lib/types';
import { PASTELS } from './Backdrops';
import HaemongButton from './HaemongButton';

interface Props {
  dream: Dream;
  index: number;
  isMine: boolean;
  /** 내가 산 꿈 → '내가 산 꿈' 표시 */
  owned: boolean;
  guest: boolean;
  vanishing: boolean;
  /** 방금 팔려서 방울·말풍선 연출 중 */
  poofing: boolean;
  fresh: boolean;
  highlighted: boolean;
  myVote?: Verdict;
  onBuy: (d: Dream) => void;
  onVote: (d: Dream, v: Verdict) => void;
  /** 판매자 닉네임을 누르면 그 사람의 꿈 모아보기 */
  onUser?: (userId: string) => void;
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

export default function DreamCard({ dream, index, isMine, owned, guest, vanishing, poofing, fresh, highlighted, myVote, onBuy, onVote, onUser }: Props) {
  const [open, setOpen] = useState(false);
  const [poof] = useState(() => POOFS[Math.floor(Math.random() * POOFS.length)]);
  const honesty = HONESTY[dream.honesty];
  const free = dream.price === 0;
  const sold = dream.status === 'sold';
  const price = formatCoins(dream.price);

  return (
    <article className={`cell ${fresh ? 'fresh' : ''}`}>
      <div className={`card ${vanishing ? 'vanish' : sold ? 'sold' : highlighted ? 'hi' : ''}`}>
        <div className="card-top">
          <span className="badge" style={{ background: honesty.tint, animationDelay: `${(index % 5) * 0.7}s` }}>
            {honesty.emoji} {honesty.label}
          </span>
          {dream.generation > 1 && (
            <span className="badge resale" title={`원래 ${dream.original_seller_nickname ?? '누군가'}님의 꿈`}>
              🔁 {dream.generation - 1}번 되판 꿈
            </span>
          )}
          {dream.content && <HaemongButton dream={dream} className="corner" label="🔮 해몽" />}
        </div>
        <h3>{dream.title}</h3>
        {dream.content && (
          <button className={`card-content ${open ? 'open' : ''}`} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <span>{dream.content}</span>
            <small>{open ? '접기 ▴' : '펼쳐 읽기 ▾'}</small>
          </button>
        )}
        {dream.review && (
          <p className="card-review" style={{ background: REVIEW_VERDICTS[dream.review.verdict].tint }}>
            <b>
              {REVIEW_VERDICTS[dream.review.verdict].emoji} {REVIEW_VERDICTS[dream.review.verdict].label}
            </b>
            “{dream.review.body}” <span>— {dream.review.user_nickname}</span>
          </p>
        )}
        <div className="votes" aria-label="꿈 감정 투표">
          {(['real', 'fake'] as const).map((v) => (
            <button
              key={v}
              className={myVote === v ? 'on' : ''}
              disabled={isMine || vanishing}
              onClick={() => onVote(dream, v)}
              title={isMine ? '내 꿈에는 투표할 수 없어요' : '감정하면 +10만 코인'}
            >
              {v === 'real' ? '😇 진짜 같다' : '🤥 지어냈다'} <b>{v === 'real' ? dream.votes_real : dream.votes_fake}</b>
            </button>
          ))}
        </div>
        <div className="card-foot">
          <span className="who">
            {onUser ? (
              <button className="who-link" onClick={() => onUser(dream.seller_id)}>
                {dream.seller_nickname}
              </button>
            ) : (
              dream.seller_nickname
            )}
            {dream.generation > 1 && dream.original_seller_nickname && ` · 원조 ${dream.original_seller_nickname}`}
            <br />
            <span>{timeAgo(dream.created_at)}</span>
          </span>
          {owned ? (
            <span className="buy-owned">🫙 내가 산 꿈</span>
          ) : sold ? (
            <span className="buy-sold">💨 {dream.buyer_nickname ?? '누군가'}님이 가져감</span>
          ) : isMine ? (
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
      {(vanishing || poofing) && (
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
