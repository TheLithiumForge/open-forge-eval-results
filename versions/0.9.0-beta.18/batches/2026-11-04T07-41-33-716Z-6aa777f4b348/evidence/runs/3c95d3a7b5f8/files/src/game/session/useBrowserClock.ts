import { useEffect } from 'react';
import type { RefObject } from 'react';
import { sampleActiveGame } from './activeTime.ts';
import type { SessionClock } from './activeTime.ts';
import type { SessionState } from './sessionState.ts';

export function useBrowserClock(
  current: RefObject<SessionState>, clock: RefObject<SessionClock>,
  publish: (state: SessionState) => void, dealId: number,
): void {
  useEffect(() => {
    let disposed = false;
    let frame: number | null = null;
    const valid = () => !disposed && current.current.dealId === dealId;
    const sample = () => {
      const state = current.current;
      const now = performance.now();
      const game = sampleActiveGame(state.game, state.paused, clock.current, now);
      clock.current.atMs = now;
      if (game !== state.game) publish({ ...state, game });
    };
    const tick = () => {
      if (!valid()) return;
      sample();
      if (clock.current.visible) frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (!valid()) return;
      sample();
      clock.current.visible = !document.hidden;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = clock.current.visible ? requestAnimationFrame(tick) : null;
    };
    clock.current.visible = !document.hidden;
    if (clock.current.visible) frame = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [current, clock, publish, dealId]);
}
