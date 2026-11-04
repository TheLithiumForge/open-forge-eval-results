import { useEffect, useRef } from 'react';

// Settling at an input event and at visibility changes uses the same monotonic clock.
export function useActiveClock(advance: (delta: number) => void, paused: boolean, revision: number) {
  const flush = useRef<() => void>(() => {});
  const advanceRef = useRef(advance);
  const revisionRef = useRef(revision);
  advanceRef.current = advance;
  revisionRef.current = revision;
  useEffect(() => {
    let anchor = performance.now();
    let shown = !document.hidden;
    let alive = true;
    const settle = () => {
      if (!alive || revisionRef.current !== revision) return;
      const now = performance.now();
      const delta = Math.max(0, Math.floor(now - anchor));
      anchor += delta;
      if (shown && !paused) advanceRef.current(delta);
    };
    const visibility = () => {
      settle();
      shown = !document.hidden;
      anchor = performance.now();
    };
    flush.current = settle;
    const timer = window.setInterval(settle, 20);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      flush.current = () => {};
    };
  }, [paused, revision]);
  return () => flush.current();
}
