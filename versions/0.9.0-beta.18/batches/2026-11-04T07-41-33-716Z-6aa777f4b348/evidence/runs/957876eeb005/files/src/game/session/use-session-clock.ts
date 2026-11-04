import { useEffect } from 'react';
import type { RefObject } from 'react';
import { advanceSession, isClockRunning, nextClockDelay, setSessionVisibility } from './active-time.ts';
import type { SessionState } from './session-state.ts';

export function useSessionClock(
  session: SessionState,
  current: RefObject<SessionState>,
  commit: (next: SessionState) => void,
): void {
  const running = isClockRunning(session);
  useEffect(() => {
    let valid = true;
    let timer: number | undefined;
    const generation = session.dealId;
    function schedule() {
      if (!valid || current.current.dealId !== generation || !isClockRunning(current.current)) return;
      timer = window.setTimeout(tick, nextClockDelay(current.current));
    }
    function tick() {
      if (!valid || current.current.dealId !== generation) return;
      commit(advanceSession(current.current, performance.now()));
      schedule();
    }
    schedule();
    return () => {
      valid = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [session.dealId, session.paused, session.visible, running, current, commit]);

  useEffect(() => {
    function visibilityChanged() {
      commit(setSessionVisibility(current.current, performance.now(), document.visibilityState === 'visible'));
    }
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => document.removeEventListener('visibilitychange', visibilityChanged);
  }, [current, commit]);
}
