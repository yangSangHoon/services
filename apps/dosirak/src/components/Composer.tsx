import { track } from '@lab/core/track';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPost, friendlyError, type Profile } from '../lib/api';
import { TAGS, today, won } from '../lib/format';
import { compressPhoto } from '../lib/image';
import { back } from '../lib/route';

const COSTS = [2000, 3000, 4000, 5000];

/** 오늘 도시락: 사진 + 메뉴 이름 + 재료비만 있으면 끝. 레시피는 접어 둔다 */
export function Composer({ profile, onSaved }: { profile: Profile; onSaved: (id: string, saved: number) => void }) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [recipe, setRecipe] = useState(false);
  const [cookMin, setCookMin] = useState<number | ''>('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const saved = Math.max(0, profile.lunch_price - (Number(cost) || 0));

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) setPhoto(await compressPhoto(f).catch(() => f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('메뉴 이름을 적어 주세요. 예: 제육볶음 도시락');
    setBusy(true);
    setError('');
    try {
      const id = await createPost(
        {
          title,
          body,
          cost: Number(cost) || 0,
          tags,
          cook_min: recipe && cookMin !== '' ? Number(cookMin) : null,
          ingredients: recipe ? ingredients.trim() : '',
          steps: recipe ? steps.trim() : '',
          eaten_on: today(),
          visibility: isPublic ? 'public' : 'private',
          photo,
        },
        profile.lunch_price,
      );
      track('dosirak', photo ? 'post-photo' : 'post');
      if (recipe && (ingredients.trim() || steps.trim())) track('dosirak', 'recipe');
      onSaved(id, saved);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <form className="page composer" onSubmit={submit} noValidate>
      <div className="page-head">
        <button type="button" className="icon-btn" onClick={() => back()}>
          ←
        </button>
        <h1>오늘 도시락 🍱</h1>
      </div>

      <button type="button" className={`photo-pick ${preview ? 'has' : ''}`} onClick={() => file.current?.click()}>
        {preview ? <img src={preview} alt="" /> : <span>📸<b>도시락 사진 찍기</b><small>뚜껑 열고 위에서 찍으면 예뻐요</small></span>}
      </button>
      <input ref={file} type="file" accept="image/*" hidden onChange={pick} />

      <input className="input big" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder="메뉴 이름 (예: 간장 닭조림 도시락)" />

      <div className="cost-box">
        <label>
          재료비
          <span className="cost-input">
            <input type="number" inputMode="numeric" value={cost} min={0} max={100000} step={100} placeholder="0" onChange={(e) => setCost(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />원
          </span>
        </label>
        <div className="chips">
          {COSTS.map((c) => (
            <button type="button" key={c} className={`chip ${cost === c ? 'on' : ''}`} onClick={() => setCost(c)}>
              {won(c)}
            </button>
          ))}
        </div>
        <p className="saved-line">
          점심 {won(profile.lunch_price)} 대신 → 오늘 <b>{won(saved)}</b> 아낌 💰
        </p>
      </div>

      <div className="chips wrap">
        {TAGS.map((t) => (
          <button type="button" key={t} className={`chip ${tags.includes(t) ? 'on' : ''}`} onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}>
            {t}
          </button>
        ))}
      </div>

      <textarea className="input" rows={2} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} placeholder="한마디 (선택) 예: 어제 남은 불고기 활용!" />

      <button type="button" className="fold" onClick={() => setRecipe(!recipe)}>
        📖 레시피도 공유하기 {recipe ? '▲' : '▼'}
      </button>
      {recipe && (
        <div className="recipe-form">
          <label className="field">
            조리 시간 (분)
            <input className="input" type="number" inputMode="numeric" value={cookMin} onChange={(e) => setCookMin(e.target.value === '' ? '' : Number(e.target.value))} placeholder="15" />
          </label>
          <label className="field">
            재료
            <textarea className="input" rows={3} maxLength={1000} value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder={'닭다리살 300g\n간장 3큰술\n올리고당 1큰술'} />
          </label>
          <label className="field">
            만드는 법
            <textarea className="input" rows={4} maxLength={2000} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={'1. 닭을 한입 크기로 썬다\n2. 양념에 10분 졸인다'} />
          </label>
        </div>
      )}

      <label className="toggle">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        <span>{isPublic ? '🌏 피드에 자랑하기' : '🔒 나만 보기 (아낀 돈만 기록)'}</span>
      </label>

      {error && <p className="err">{error}</p>}
      <button className="btn primary block big" disabled={busy}>
        {busy ? '올리는 중…' : `싸왔어! ${saved > 0 ? `(+${won(saved)})` : ''}`}
      </button>
    </form>
  );
}
