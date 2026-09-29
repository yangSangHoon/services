import type { CSSProperties } from 'react';

export const PASTELS = ['#c9b8ff', '#ffc2da', '#bdeedb', '#ffe596', '#bfe0ff', '#ffd6b5'];

/** 매번 같은 배치가 나오도록 시드 고정 난수 */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const STARS = (() => {
  const r = seeded(7);
  return Array.from({ length: 46 }, () => {
    const size = r() < 0.25 ? 12 : r() < 0.5 ? 7 : 4;
    return {
      size,
      style: {
        left: `${r() * 100}%`,
        top: `${r() * 80}%`,
        width: size,
        height: size,
        animation: `dcTwinkle ${2 + r() * 3}s ${r() * 3}s ease-in-out infinite`,
      } as CSSProperties,
    };
  });
})();

/** 첫 화면 · 첫 계시의 반짝이는 별과 별똥별 */
export function Stars() {
  return (
    <div className="sky" aria-hidden>
      {STARS.map((s, i) => (
        <i key={i} className={s.size > 4 ? 'sparkle' : 'dot'} style={s.style} />
      ))}
      {[0, 1].map((k) => (
        <i
          key={`s${k}`}
          className="shoot"
          style={{ top: `${8 + k * 22}%`, left: `${62 + k * 26}%`, animation: `dcShoot ${7 + k * 4}s ${1.5 + k * 3}s linear infinite` }}
        />
      ))}
    </div>
  );
}

const SPARKLES = (() => {
  const r = seeded(3);
  return Array.from({ length: 18 }, (_, i) => {
    const size = 6 + r() * 8;
    return {
      left: `${r() * 100}%`,
      top: `${r() * 100}%`,
      width: size,
      height: size,
      background: PASTELS[i % PASTELS.length],
      animation: `dcTwinkle ${2.5 + r() * 3}s ${r() * 3}s ease-in-out infinite`,
    } as CSSProperties;
  });
})();

/** 시장 · 내 꿈 화면 뒤에 떠다니는 빛망울 */
export function AppBackdrop() {
  return (
    <div className="app-bg" aria-hidden>
      <div className="blob" style={{ left: -80, top: 120, width: 280, height: 280, background: 'radial-gradient(circle, rgba(201,184,255,.55), transparent 70%)' }} />
      <div
        className="blob"
        style={{ right: -100, top: 360, width: 320, height: 320, background: 'radial-gradient(circle, rgba(255,194,218,.5), transparent 70%)', animationDuration: '18s', animationDirection: 'reverse' }}
      />
      <div
        className="blob"
        style={{ left: '20%', bottom: -120, width: 360, height: 300, background: 'radial-gradient(circle, rgba(189,238,219,.45), transparent 70%)', animationDuration: '20s' }}
      />
      {SPARKLES.map((style, i) => (
        <i key={i} className="sparkle" style={style} />
      ))}
    </div>
  );
}

export const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

export const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
