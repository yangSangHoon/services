import { AutoHeight, MorphText, PopNumber, Reveal, SwapText, usePresence } from '@lab/core/motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PRESETS, type Food, type Verdict } from './data';
import { evaluate, FOOD_BY_ID, partnerCount, previewWith, searchFoods, type PairResult } from './match';

const STORAGE_KEY = 'food-match:table';
const CHIP_EXIT_MS = 180;

const VERDICT: Record<Verdict, { label: string; icon: string }> = {
  bad: { label: '주의', icon: '🚨' },
  good: { label: '찰떡', icon: '💚' },
  myth: { label: '속설', icon: '🤔' },
};

/** 공유 링크(#t=a,b) → 저장된 식탁 순으로 초기값 */
function loadTable(): string[] {
  const fromHash = location.hash.match(/^#t=([\w,-]+)$/)?.[1];
  if (fromHash) return fromHash.split(',').filter((id) => FOOD_BY_ID.has(id));
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter((id) => FOOD_BY_ID.has(id)) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [ids, setIds] = useState<string[]>(loadTable);
  // 빠지는 중인 칩: 모션이 끝나면 ids 에서 지운다. 판정에서는 바로 뺀다
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const leavingRef = useRef(leaving);
  leavingRef.current = leaving;
  const chips = useMemo(() => ids.map((id) => FOOD_BY_ID.get(id)!), [ids]);
  const table = useMemo(() => chips.filter((f) => !leaving.has(f.id)), [chips, leaving]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* 저장 못 해도 동작에는 문제 없음 */
    }
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  }, [ids]);

  const add = (id: string) => {
    setLeaving((cur) => (cur.has(id) ? new Set([...cur].filter((x) => x !== id)) : cur));
    setIds((cur) => (cur.includes(id) ? cur : [...cur, id]));
  };
  const remove = (...out: string[]) => {
    setLeaving((cur) => new Set([...cur, ...out]));
    setTimeout(() => {
      // 그새 다시 담은 음식(leaving 에서 빠진 것)은 남긴다
      const gone = out.filter((x) => leavingRef.current.has(x));
      setIds((cur) => cur.filter((x) => !gone.includes(x)));
      setLeaving((cur) => new Set([...cur].filter((x) => !gone.includes(x))));
    }, CHIP_EXIT_MS);
  };
  const toggle = (id: string) => (ids.includes(id) && !leaving.has(id) ? remove(id) : add(id));
  const preset = (next: string[]) => {
    setLeaving(new Set());
    setIds(next);
  };

  return (
    <div className="app">
      <header className="top">
        <span className="logo">🥢 찰떡궁합</span>
      </header>

      <section className="hero">
        <h1>
          이거랑 이거,
          <br />
          <em>같이 먹어도 돼?</em>
        </h1>
        <p className="muted">음식을 식탁에 담으면 궁합을 알려드려요. 흔한 속설도 가려드려요.</p>
      </section>

      <SearchBox table={table} onToggle={toggle} />

      <TableBar chips={chips} leaving={leaving} count={table.length} onRemove={remove} onClear={() => remove(...ids)} />

      <VerdictCard table={table} onPreset={preset} />

      <footer className="foot">
        일반적인 영양 정보예요. 질환이 있거나 약을 먹고 있다면 의사·약사와 상의하세요.
      </footer>
    </div>
  );
}

// ───────── 검색

function SearchBox({ table, onToggle }: { table: Food[]; onToggle: (id: string) => void }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => searchFoods(q).slice(0, 8), [q]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdown = usePresence(Boolean(q));

  // 닫히는 동안에는 마지막 결과를 그대로 보여준다
  const lastShown = useRef({ q, results });
  if (q) lastShown.current = { q, results };
  const shown = lastShown.current;
  const ids = table.map((f) => f.id);

  const pick = (f: Food) => {
    onToggle(f.id);
    setQ('');
    inputRef.current?.focus();
  };

  return (
    <section className="search">
      <div className="search-field">
        <span aria-hidden>🔍</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0] && !e.nativeEvent.isComposing) pick(results[0]);
            if (e.key === 'Escape') setQ('');
          }}
          placeholder="음식 검색 (예: 시금치, 치킨, ㅅㅈ)"
          aria-label="음식 검색"
          enterKeyHint="done"
        />
        {q && (
          <button className="clear" onClick={() => setQ('')} aria-label="검색어 지우기">
            ✕
          </button>
        )}
      </div>

      {dropdown.mounted && (
        <ul className={`results t-dropdown ${dropdown.className}`} data-origin="top-center">
          {shown.results.length === 0 && <li className="empty muted">아직 준비 중인 음식이에요. 계속 늘려갈게요!</li>}
          {shown.results.map((f) => {
            const added = ids.includes(f.id);
            const hint = added ? null : previewWith(f, table);
            return (
              <li key={f.id}>
                <button className={`result ${added ? 'is-added' : ''}`} onClick={() => pick(f)} tabIndex={q ? 0 : -1}>
                  <span className="r-emoji">{f.emoji}</span>
                  <span className="r-name">{f.name}</span>
                  {hint ? (
                    <span className={`tag tag-${hint}`}>
                      내 식탁과 {VERDICT[hint].icon} {VERDICT[hint].label}
                    </span>
                  ) : (
                    <span className="r-meta muted">궁합 {partnerCount(f)}</span>
                  )}
                  <span className="r-add">{added ? '✓ 담김' : '+ 담기'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ───────── 내 식탁

function TableBar({
  chips,
  leaving,
  count,
  onRemove,
  onClear,
}: {
  chips: Food[];
  leaving: Set<string>;
  count: number;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <section className="table">
      <div className="table-head">
        <h2>
          내 식탁{' '}
          <span className="count">
            <PopNumber value={count} />
          </span>
        </h2>
        {count > 0 && (
          <button className="link" onClick={onClear}>
            비우기
          </button>
        )}
      </div>
      {chips.length === 0 ? (
        <p className="muted small">검색해서 음식을 담아보세요.</p>
      ) : (
        <ul className="chips">
          {chips.map((f) => (
            <li key={f.id} className={`chip ${leaving.has(f.id) ? 'is-leaving' : ''}`}>
              <span>{f.emoji}</span>
              {f.name}
              <button onClick={() => onRemove(f.id)} aria-label={`${f.name} 빼기`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ───────── 판정

type Tone = Verdict | 'none' | 'idle';

const HEADLINE: Record<Tone, { icon: string; title: string }> = {
  idle: { icon: '🍽️', title: '두 가지 이상 담으면 궁합을 알려드려요' },
  bad: { icon: '🚨', title: '같이 먹을 때 주의할 조합이 있어요' },
  good: { icon: '💚', title: '찰떡궁합이에요!' },
  myth: { icon: '🤔', title: '걱정 마세요, 그냥 속설이에요' },
  none: { icon: '😋', title: '특별히 알려진 궁합은 없어요' },
};

function VerdictCard({ table, onPreset }: { table: Food[]; onPreset: (ids: string[]) => void }) {
  const pairs = useMemo(() => evaluate(table), [table]);
  const count = (v: Verdict) => pairs.filter((p) => p.rule.verdict === v).length;

  const tone: Tone =
    table.length < 2 ? 'idle' : count('bad') ? 'bad' : count('good') ? 'good' : count('myth') ? 'myth' : 'none';
  const headline = HEADLINE[tone];

  return (
    <section className={`verdict tone-${tone}`}>
      <div className="v-icon" key={tone}>
        {headline.icon}
      </div>
      <AutoHeight>
        <h2 className="v-title">
          <SwapText text={headline.title} />
        </h2>

        {tone === 'idle' && (
          <>
            <p className="muted small">이런 조합은 어때요?</p>
            <div className="presets">
              {PRESETS.map((p) => (
                <button key={p.label} className="preset" onClick={() => onPreset(p.ids)}>
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}

        {tone === 'none' && <p className="muted">서로 방해하지 않아요. 맛있게 드세요!</p>}

        {pairs.length > 0 && (
          <>
            <div className="v-counts">
              {(['bad', 'good', 'myth'] as const).map(
                (v) =>
                  count(v) > 0 && (
                    <span key={v} className={`tag tag-${v}`}>
                      {VERDICT[v].icon} {VERDICT[v].label} <PopNumber value={count(v)} />
                    </span>
                  ),
              )}
            </div>
            <ul className="pairs">
              {pairs.map((p, i) => (
                <PairRow key={`${p.a.id}-${p.b.id}-${p.rule.title}`} pair={p} index={Math.min(i, 5)} />
              ))}
            </ul>
          </>
        )}

        {tone !== 'idle' && <ShareButton table={table} />}
      </AutoHeight>
    </section>
  );
}

function PairRow({ pair: { a, b, rule }, index }: { pair: PairResult; index: number }) {
  return (
    <Reveal as="li" index={index} className={`pair pair-${rule.verdict}`}>
      <div className="pair-head">
        <span className="pair-foods">
          {a.emoji} {a.name} <b>+</b> {b.emoji} {b.name}
        </span>
        <span className={`tag tag-${rule.verdict}`}>
          {VERDICT[rule.verdict].icon} {VERDICT[rule.verdict].label}
        </span>
      </div>
      <p className="pair-title">{rule.title}</p>
      <p className="pair-why">{rule.why}</p>
    </Reveal>
  );
}

function ShareButton({ table }: { table: Food[] }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${location.origin}${location.pathname}#t=${table.map((f) => f.id).join(',')}`;
    const text = `${table.map((f) => f.emoji + f.name).join(' + ')}, 같이 먹어도 될까?`;
    try {
      if (navigator.share) return await navigator.share({ title: '찰떡궁합', text, url });
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 사용자가 공유 취소 */
    }
  };
  return (
    <button className="share" onClick={share}>
      <MorphText text={copied ? '✓ 링크를 복사했어요' : '🔗 이 조합 공유하기'} />
    </button>
  );
}
