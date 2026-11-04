import { useCallback, useEffect, useRef } from 'react';

type ClockProps = { enabled: boolean; generation: number; advance: (milliseconds: number) => number };

export function useClock({ enabled, generation, advance }: ClockProps): () => void {
  const anchor = useRef<number | null>(null);
  const flush = useCallback(() => {
    if (anchor.current === null) return 100;
    const now = performance.now();
    const delta = Math.max(0, Math.floor(now - anchor.current));
    anchor.current += delta;
    return advance(delta);
  }, [advance]);

  useEffect(() => {
    let valid = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    anchor.current = enabled && !document.hidden ? performance.now() : null;
    const tick = () => {
      if (!valid) return;
      const delay = flush();
      timer = setTimeout(tick, Math.max(1, delay));
    };
    const visibility = () => {
      flush();
      anchor.current = enabled && !document.hidden ? performance.now() : null;
    };
    if (enabled) timer = setTimeout(tick, 100);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      valid = false;
      clearTimeout(timer);
      anchor.current = null;
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [enabled, generation, flush]);
  return flush;
}
