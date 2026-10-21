import { track } from '@lab/core/track';
import { useEffect, useState } from 'react';
import { addComment, deleteComment, deletePost, fetchComments, fetchPost, friendlyError, like, photoUrl, type Comment, type PostFull } from '../lib/api';
import { ago, dayLabel, won } from '../lib/format';
import { back, go } from '../lib/route';

export function PostDetail({ id, me, needProfile }: { id: string; me: string | null; needProfile: () => Promise<boolean> }) {
  const [post, setPost] = useState<PostFull | null | undefined>(undefined);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPost(id).then(setPost).catch(() => setPost(null));
    fetchComments(id).then(setComments).catch(() => undefined);
  }, [id]);

  if (post === undefined) return <p className="muted center">🍱 불러오는 중…</p>;
  if (post === null)
    return (
      <div className="page">
        <p className="muted center">없거나 비공개된 도시락이에요.</p>
      </div>
    );

  const mine = post.user_id === me;
  const src = photoUrl(post.photo_path);

  const toggleLike = async () => {
    if (!(await needProfile())) return;
    const next = !post.liked;
    setPost({ ...post, liked: next, like_count: post.like_count + (next ? 1 : -1) });
    await like(post.id, next).catch(() => setPost(post));
    if (next) track('dosirak', 'like');
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !(await needProfile())) return;
    try {
      await addComment(post.id, text);
      setText('');
      setComments(await fetchComments(post.id));
      track('dosirak', 'comment');
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  const share = async () => {
    const url = location.href;
    const msg = `${post.title} 🍱 ${post.saved > 0 ? `(점심값 ${won(post.saved)} 아낌)` : ''}`;
    try {
      if (navigator.share) await navigator.share({ title: '싸왔어?', text: msg, url });
      else await navigator.clipboard.writeText(`${msg}\n${url}`);
      track('dosirak', 'share');
    } catch {
      /* 닫음 */
    }
  };

  return (
    <div className="page detail">
      <div className="page-head">
        <button className="icon-btn" onClick={() => back()}>
          ←
        </button>
        <button className="author" onClick={() => go(`#/u/${post.user_id}`)}>
          <span className="av">{post.avatar}</span>
          <b>{post.nickname}</b>
          <span className="muted small">{dayLabel(post.eaten_on)}</span>
        </button>
      </div>
      {src && <img className="detail-photo" src={src} alt={post.title} />}
      <h1 className="detail-title">{post.title}</h1>
      <div className="money">
        {post.cost > 0 && <span>재료비 {won(post.cost)}</span>}
        {post.saved > 0 && <b>💰 점심값 {won(post.saved)} 아낌</b>}
        {post.visibility === 'private' && <span>🔒 나만 보기</span>}
      </div>
      {post.tags.length > 0 && (
        <div className="tags">
          {post.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      )}
      {post.body && <p className="detail-body">{post.body}</p>}

      {post.has_recipe && (
        <section className="recipe">
          <h2>📖 레시피 {post.cook_min ? <small>⏱ {post.cook_min}분</small> : null}</h2>
          {post.ingredients && (
            <>
              <h3>재료</h3>
              <ul>
                {post.ingredients.split('\n').filter(Boolean).map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </>
          )}
          {post.steps && (
            <>
              <h3>만드는 법</h3>
              <p className="pre">{post.steps}</p>
            </>
          )}
        </section>
      )}

      <div className="row-btns">
        <button className={`btn ${post.liked ? 'primary' : 'ghost'}`} onClick={toggleLike}>
          {post.liked ? '🤤' : '😋'} 맛있겠다 {post.like_count || ''}
        </button>
        <button className="btn ghost" onClick={share}>
          📤 공유
        </button>
        {mine && (
          <button
            className={`btn ghost ${confirmDel ? 'danger' : ''}`}
            onClick={async () => {
              if (!confirmDel) return setConfirmDel(true);
              await deletePost(post);
              go('#/me');
            }}
          >
            {confirmDel ? '정말 지울까요?' : '🗑️'}
          </button>
        )}
      </div>

      <section className="comments">
        <h2>💬 댓글 {comments.length || ''}</h2>
        {comments.map((c) => (
          <div key={c.id} className="comment">
            <span className="av sm">{c.avatar}</span>
            <div>
              <b>{c.nickname}</b> <span className="muted small">{ago(c.created_at)}</span>
              <p>{c.body}</p>
            </div>
            {c.user_id === me && (
              <button
                className="x"
                onClick={async () => {
                  await deleteComment(c.id);
                  setComments(comments.filter((x) => x.id !== c.id));
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <form className="comment-form" onSubmit={send}>
          <input className="input" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder={post.has_recipe ? '따라 해 볼게요! 😋' : '레시피 알려주세요 🙏'} />
          <button className="btn primary" disabled={!text.trim()}>
            등록
          </button>
        </form>
        {error && <p className="err">{error}</p>}
      </section>
    </div>
  );
}
