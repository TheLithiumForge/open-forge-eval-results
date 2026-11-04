import { useCallback, useEffect, useRef } from 'react';

export function useActiveClock(advance: (milliseconds: number, deal: number) => void,
  deal: number, remainingMs: number | null) {
  const stamp = useRef(performance.now());
  const visible = useRef(!document.hidden);
  const flush = useCallback(() => {
    const now = performance.now();
    const delta = Math.max(0, now - stamp.current);
    stamp.current = now;
    if (visible.current) advance(delta, deal);
  }, [advance, deal]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!alive) return;
      flush();
      timer = setTimeout(tick, 25);
    };
    const visibility = () => {
      flush();
      visible.current = !document.hidden;
    };
    timer = setTimeout(tick, Math.min(25, remainingMs ?? 25));
    document.addEventListener('visibilitychange', visibility);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [flush, remainingMs]);
  return flush;
}
