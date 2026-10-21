import { track } from '@lab/core/track';
import { useState } from 'react';
import { like, photoUrl, type Post } from '../lib/api';
import { ago, won } from '../lib/format';
import { go } from '../lib/route';

export function PostCard({ post, needProfile }: { post: Post; needProfile: () => Promise<boolean> }) {
  const [liked, setLiked] = useState(post.liked);
  const [count, setCount] = useState(post.like_count);
  const [pop, setPop] = useState(0);
  const src = photoUrl(post.photo_path);

  const toggle = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!(await needProfile())) return;
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    if (next) setPop((n) => n + 1);
    try {
      await like(post.id, next);
      if (next) track('dosirak', 'like');
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
  };

  return (
    <article className="post" onClick={() => go(`#/p/${post.id}`)}>
      <button
        className="author"
        onClick={(e) => {
          e.stopPropagation();
          go(`#/u/${post.user_id}`);
        }}
      >
        <span className="av">{post.avatar}</span>
        <b>{post.nickname}</b>
        <span className="muted small">{ago(post.created_at)}</span>
      </button>
      {src ? (
        <div className="photo" onDoubleClick={() => !liked && toggle()}>
          <img src={src} alt={post.title} loading="lazy" />
          {post.saved > 0 && <span className="saved-badge">💰 {won(post.saved)} 아낌</span>}
          {post.has_recipe && <span className="recipe-badge">📖 레시피</span>}
        </div>
      ) : (
        <div className="photo empty">🍱{post.saved > 0 && <span className="saved-badge">💰 {won(post.saved)} 아낌</span>}</div>
      )}
      <div className="post-body">
        <h3>{post.title}</h3>
        {post.body && <p className="clamp">{post.body}</p>}
        {post.tags.length > 0 && (
          <div className="tags">
            {post.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        )}
        <div className="post-foot">
          <button className={`yum ${liked ? 'on' : ''}`} onClick={toggle} aria-pressed={liked}>
            <span key={pop} className="yum-ic">
              {liked ? '🤤' : '😋'}
            </span>
            맛있겠다 {count > 0 && <b>{count}</b>}
          </button>
          <span className="muted small">💬 {post.comment_count}</span>
          {post.cost > 0 && <span className="muted small cost">재료비 {won(post.cost)}</span>}
        </div>
      </div>
    </article>
  );
}
