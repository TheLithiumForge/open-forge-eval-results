import { useCallback, useEffect, useRef } from 'react';

export function useActiveClock(generation: number, advance: (milliseconds: number) => void) {
  const previous = useRef(performance.now());
  const visible = useRef(!document.hidden);
  const epoch = useRef(0);
  const flush = useCallback(() => {
    const now = performance.now();
    const delta = Math.max(0, now - previous.current);
    previous.current = now;
    if (visible.current) advance(delta);
  }, [advance]);
  const reset = useCallback(() => {
    epoch.current += 1;
    previous.current = performance.now();
    visible.current = !document.hidden;
  }, []);

  useEffect(() => {
    let active = true;
    const token = epoch.current;
    let frame = 0;
    const render = () => {
      if (!active || token !== epoch.current) return;
      flush();
      frame = requestAnimationFrame(render);
    };
    const visibility = () => {
      if (!active || token !== epoch.current) return;
      flush();
      visible.current = !document.hidden;
    };
    frame = requestAnimationFrame(render);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [generation, flush]);
  return { flush, reset };
}
