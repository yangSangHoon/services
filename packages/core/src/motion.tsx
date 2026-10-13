import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * motion.css(transitions.dev 조각)를 React에서 쓰기 위한 훅·컴포넌트.
 * 앱에서 '@lab/core/motion.css' 를 함께 import 해야 한다.
 */

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** :root 의 시간 토큰 → ms. 빌드 때 150ms 가 .15s 로 압축되므로 단위를 본다 */
const cssMs = (name: string, fallback: number) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return fallback;
  return raw.endsWith('ms') ? n : raw.endsWith('s') ? n * 1000 : n;
};

/** 다음 프레임에 실행. 백그라운드 등으로 rAF 가 멈춰도 넘어가도록 타이머를 함께 건다 */
const nextFrame = (cb: () => void) => {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cb();
  };
  const raf = requestAnimationFrame(() => requestAnimationFrame(run));
  const t = setTimeout(run, 50);
  return () => {
    done = true;
    cancelAnimationFrame(raf);
    clearTimeout(t);
  };
};

// ───────── Menu dropdown 등 열림/닫힘

type Phase = 'hidden' | 'enter' | 'open' | 'closing';

/**
 * 닫힘 모션이 끝날 때까지 언마운트를 늦춘다.
 * `mounted` 일 때 렌더하고, 요소에 `className`(is-open / is-closing)을 붙인다.
 */
export function usePresence(open: boolean, closeToken = '--dropdown-close-dur') {
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'hidden');

  useEffect(() => {
    if (open) {
      if (phase === 'hidden' || phase === 'closing') setPhase('enter');
      else if (phase === 'enter') {
        return nextFrame(() => setPhase('open'));
      }
    } else if (phase === 'open' || phase === 'enter') {
      setPhase('closing');
    } else if (phase === 'closing') {
      const t = setTimeout(() => setPhase('hidden'), reduced() ? 0 : cssMs(closeToken, 150));
      return () => clearTimeout(t);
    }
  }, [open, phase, closeToken]);

  return {
    mounted: phase !== 'hidden',
    className: phase === 'open' ? 'is-open' : phase === 'closing' ? 'is-closing' : '',
  };
}

// ───────── Card resize

/** 내용이 바뀌어 높이가 달라질 때 높이를 부드럽게 늘이고 줄인다 */
export function AutoHeight({ children, className = '' }: { children: ReactNode; className?: string }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const el = inner.current!;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`t-resize ${className}`} style={{ height }}>
      <div ref={inner}>{children}</div>
    </div>
  );
}

// ───────── Text states swap

/** 글자가 바뀌면 이전 글자는 위로 흐려지며 사라지고 새 글자가 아래에서 올라온다 */
export function SwapText({ text, className = '' }: { text: string; className?: string }) {
  const [shown, setShown] = useState(text);
  const [phase, setPhase] = useState<'' | 'is-exit' | 'is-enter-start'>('');

  useEffect(() => {
    if (text === shown) return;
    if (reduced()) return setShown(text);
    setPhase('is-exit');
    const t = setTimeout(() => {
      setShown(text);
      setPhase('is-enter-start');
    }, cssMs('--text-swap-dur', 150));
    return () => clearTimeout(t);
  }, [text, shown]);

  useEffect(() => {
    if (phase !== 'is-enter-start') return;
    return nextFrame(() => setPhase(''));
  }, [phase]);

  return <span className={`t-text-swap ${phase} ${className}`}>{shown}</span>;
}

// ───────── Number pop-in

const commonPrefix = (a: string, b: string) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

/** 숫자가 바뀌면 바뀐 자리만 튀어 들어온다 */
export function PopNumber({ value }: { value: number | string }) {
  const str = String(value);
  const [state, setState] = useState({ str, same: str.length, version: 0 });
  if (state.str !== str) setState({ str, same: commonPrefix(state.str, str), version: state.version + 1 });

  const chars = [...state.str];
  return (
    <span key={state.version} className={`t-digit-group ${state.version ? 'is-animating' : ''}`}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className="t-digit"
          data-same={i < state.same ? '' : undefined}
          data-stagger={i === chars.length - 2 ? '1' : i === chars.length - 1 && chars.length > 1 ? '2' : undefined}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

// ───────── Texts reveal (항목 단위)

/** 마운트될 때 아래에서 흐릿하게 올라온다. index 만큼 늦게 시작(stagger) */
export function Reveal({
  children,
  index = 0,
  as: Tag = 'div',
  className = '',
}: {
  children: ReactNode;
  index?: number;
  as?: 'div' | 'li';
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    return nextFrame(() => setShown(true));
  }, []);
  return (
    <Tag className={`t-reveal ${shown ? 'is-shown' : ''} ${className}`} style={{ '--i': index } as CSSProperties}>
      {children}
    </Tag>
  );
}

// ───────── Text morph

/** 두 문구가 공유하는 앞뒤 글자는 그대로 두고, 다른 부분만 흐려지며 바뀐다 */
export function MorphText({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    const el = ref.current!;
    if (prev.current === null || reduced()) {
      el.textContent = text;
      prev.current = text;
      return;
    }
    const from = prev.current;
    if (from === text) return;
    prev.current = text;

    let a = 0;
    while (a < from.length && a < text.length && from[a] === text[a]) a++;
    let b = 0;
    while (b < from.length - a && b < text.length - a && from[from.length - 1 - b] === text[text.length - 1 - b]) b++;

    const swap = document.createElement('span');
    swap.className = 't-morph-swap';
    const out = document.createElement('span');
    out.className = 't-morph-old';
    out.setAttribute('aria-hidden', 'true');
    out.textContent = from.slice(a, from.length - b);
    const inn = document.createElement('span');
    inn.className = 't-morph-new';
    inn.textContent = text.slice(a, text.length - b);
    swap.append(out, inn);

    el.textContent = '';
    el.append(text.slice(0, a), swap, text.slice(text.length - b));

    swap.style.width = `${out.getBoundingClientRect().width}px`;
    void swap.offsetWidth; // 리플로우를 강제해야 width 가 transition 된다
    swap.classList.add('is-morphing');
    swap.style.width = `${inn.getBoundingClientRect().width}px`;

    const t = setTimeout(
      () => (el.textContent = text),
      Math.max(cssMs('--text-morph-dur', 180), cssMs('--text-morph-resize-dur', 240)) + 40,
    );
    return () => {
      clearTimeout(t);
      el.textContent = text;
    };
  }, [text]);

  return <span ref={ref} className={`t-morph ${className}`} />;
}
