import { useEffect, useRef, useState } from 'react';

/** 숫자가 목표값까지 촤라락 올라가는 애니메이션 */
export function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (from === target) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      current.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
