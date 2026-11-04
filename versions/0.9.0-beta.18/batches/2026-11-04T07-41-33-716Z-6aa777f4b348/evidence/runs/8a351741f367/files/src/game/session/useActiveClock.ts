import { useEffect } from 'react';

export function useActiveClock(
  epoch: number,
  onTime: (now: number, epoch: number) => void,
  onVisibility: (visible: boolean, epoch: number) => void,
): void {
  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const tick = (now: number): void => {
      if (cancelled) return;
      onTime(now, epoch);
      frame = requestAnimationFrame(tick);
    };
    const visibility = (): void => {
      onTime(performance.now(), epoch);
      onVisibility(!document.hidden, epoch);
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [epoch, onTime, onVisibility]);
}
