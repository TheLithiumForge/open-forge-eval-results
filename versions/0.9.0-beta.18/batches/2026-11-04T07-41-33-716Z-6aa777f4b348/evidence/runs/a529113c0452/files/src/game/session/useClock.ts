import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { createActiveClock } from './clock.ts';
import type { SessionState } from './sessionState.ts';

export function useSessionClock(current: RefObject<SessionState>, publish: (next: SessionState) => void) {
  const [clock] = useState(() => createActiveClock(performance.now(), !document.hidden));
  const resetId = current.current.resetId;
  const paused = current.current.paused;
  const sample = useCallback((): SessionState => {
    const state = current.current;
    const game = clock.advance(state.game, state.paused, performance.now());
    return game === state.game ? state : { ...state, game };
  }, [clock, current]);
  const resetClock = useCallback(() => clock.reset(performance.now(), !document.hidden), [clock]);

  useEffect(() => {
    let active = true;
    let timeout: number;
    const valid = () => active && current.current.resetId === resetId;
    const schedule = () => {
      const state = current.current;
      const delay = state.game.selection.kind === 'mismatch' && !state.paused && !document.hidden
        ? Math.max(1, Math.min(50, state.game.selection.remainingMs)) : 50;
      timeout = window.setTimeout(tick, delay);
    };
    const tick = () => {
      if (!valid()) return;
      publish(sample());
      schedule();
    };
    const visibility = () => {
      if (!valid()) return;
      const state = current.current;
      const game = clock.setVisible(state.game, state.paused, performance.now(), !document.hidden);
      publish(game === state.game ? state : { ...state, game });
      window.clearTimeout(timeout);
      schedule();
    };
    document.addEventListener('visibilitychange', visibility);
    schedule();
    return () => {
      active = false;
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [clock, current, paused, publish, resetId, sample]);

  return { sample, resetClock };
}
