import { useCallback, useEffect, useRef } from 'react';

// One monotonic timeline drives both elapsed time and mismatch deadlines.
export function useActiveClock(advance: (milliseconds: number) => void, generation: number, nextDelay: () => number) {
  const last = useRef(performance.now());
  const visible = useRef(!document.hidden);
  const token = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tickRef = useRef<(() => void) | null>(null);
  const flush = useCallback(() => {
    const now = performance.now();
    const delta = Math.max(0, now - last.current);
    last.current = now;
    if (visible.current) advance(delta);
  }, [advance]);
  const rebase = useCallback(() => { last.current = performance.now(); }, []);
  const reschedule = useCallback(() => {
    clearTimeout(timer.current);
    if (tickRef.current) timer.current = setTimeout(tickRef.current, visible.current ? Math.max(1, Math.ceil(nextDelay())) : 32);
  }, [nextDelay]);

  useEffect(() => {
    const version = ++token.current;
    rebase();
    visible.current = !document.hidden;
    const tick = () => {
      if (version !== token.current) return;
      flush();
      reschedule();
    };
    const visibility = () => {
      flush();
      visible.current = !document.hidden;
      reschedule();
    };
    tickRef.current = tick;
    reschedule();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      token.current++;
      clearTimeout(timer.current);
      tickRef.current = null;
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [flush, generation, rebase, reschedule]);
  return { flush, rebase, reschedule };
}
