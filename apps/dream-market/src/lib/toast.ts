import { useEffect, useState } from 'react';

export type Toast = { id: number; text: string; tone: 'info' | 'success' | 'error' };

let toasts: Toast[] = [];
let seq = 0;
const subs = new Set<(t: Toast[]) => void>();
const emit = () => subs.forEach((s) => s(toasts));

export function toast(text: string, tone: Toast['tone'] = 'info') {
  const t = { id: ++seq, text, tone };
  toasts = [...toasts, t].slice(-4);
  emit();
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    emit();
  }, 3500);
}

export function useToasts() {
  const [state, setState] = useState(toasts);
  useEffect(() => {
    subs.add(setState);
    return () => {
      subs.delete(setState);
    };
  }, []);
  return state;
}
