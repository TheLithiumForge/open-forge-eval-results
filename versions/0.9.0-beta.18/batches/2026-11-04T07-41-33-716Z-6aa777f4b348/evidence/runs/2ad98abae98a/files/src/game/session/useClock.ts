import { useCallback, useEffect, useRef } from 'react';

export function useClock(advance: (milliseconds: number) => void, generation: number) {
  const last = useRef(performance.now());
  const visible = useRef(!document.hidden);
  const epoch = useRef(0);
  const flush = useCallback(() => {
    const now = performance.now();
    const delta = Math.max(0, now - last.current);
    last.current = now;
    if (visible.current) advance(delta);
  }, [advance]);
  const reset = useCallback(() => {
    epoch.current++;
    last.current = performance.now();
    visible.current = !document.hidden;
  }, []);
  useEffect(() => {
    let cancelled = false;
    const token = epoch.current;
    const tick = () => { if (!cancelled && token === epoch.current) flush(); };
    const visibility = () => {
      if (cancelled || token !== epoch.current) return;
      flush();
      visible.current = !document.hidden;
    };
    const timer = window.setInterval(tick, 32);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [flush, generation]);
  return { flush, reset };
}
