import { track } from '@lab/core/track';
import { useState } from 'react';
import { moodOf } from '../lib/moods';
import { like, type FeedItem } from '../lib/social';
import { clock, dateLabel } from '../lib/time';

/** 다른 사람의 공개 찰나: 작성자 + 폴라로이드 + 공감 */
export function FeedCard({ item, photo, onAuthor }: { item: FeedItem; photo?: string; onAuthor?: (userId: string) => void }) {
  const [liked, setLiked] = useState(item.liked);
  const [count, setCount] = useState(item.like_count);
  const [pop, setPop] = useState(0);
  const mood = moodOf(item.mood);
  const d = new Date(item.happened_at);

  const toggle = async () => {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    if (next) setPop((n) => n + 1);
    try {
      await like(item.id, next);
      if (next) track('moments', 'like');
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
  };

  return (
    <article className="feed-card" style={mood ? ({ '--mood': mood.color } as React.CSSProperties) : undefined}>
      <button className="author" onClick={() => onAuthor?.(item.user_id)} disabled={!onAuthor}>
        <span className="avatar">{item.avatar}</span>
        <span className="author-name">{item.nickname}</span>
        <span className="author-time">
          {dateLabel(d)} · {clock(d)}
        </span>
      </button>
      {item.photo_path && (
        <div className="card-photo" onDoubleClick={() => !liked && toggle()}>
          {photo ? <img src={photo} alt="" loading="lazy" /> : <span className="ph" />}
        </div>
      )}
      {item.body && <p className="feed-body">{item.body}</p>}
      <div className="feed-foot">
        <button className={`like ${liked ? 'on' : ''}`} onClick={toggle} aria-pressed={liked} aria-label="공감">
          <span className="heart" key={pop}>
            {liked ? '❤️' : '🤍'}
          </span>
          {count > 0 && <span>{count}</span>}
        </button>
        {mood && (
          <span className="feed-mood">
            {mood.emoji} {mood.label}
          </span>
        )}
      </div>
    </article>
  );
}
