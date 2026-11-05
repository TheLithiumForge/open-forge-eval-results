import { useEffect, useRef } from 'react';
import { isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { CLOCK_INTERVAL_MS, createClock, elapsedStep } from './browser-clock.ts';
import { tickSession } from './session.ts';
import type { RefObject } from 'react';
import type { Session } from './session.ts';

export function useSessionClock(
  session: Session,
  current: RefObject<Session>,
  commit: (next: Session) => void,
  suspended = false,
) {
  const clock = useRef(createClock(performance.now()));
  const visible = useRef(!document.hidden);
  // A suspended game is one the player isn't looking at, such as one behind another screen.
  const away = useRef(suspended);
  const won = isWon(session.game);

  function running(): boolean {
    return (
      visible.current &&
      !away.current &&
      !current.current.paused &&
      current.current.game.started &&
      !isWon(current.current.game)
    );
  }

  function synchronize(generation = current.current.generation): void {
    if (generation !== current.current.generation) return;
    const now = performance.now();
    const step = elapsedStep(clock.current, now, running());
    clock.current = step.clock;
    if (step.milliseconds) commit(tickSession(current.current, generation, step.milliseconds));
  }

  useEffect(() => {
    // Like a visibility change, credit the slice that was active before the flag flips.
    synchronize();
    away.current = suspended;
  }, [suspended]);

  useEffect(() => {
    const generation = session.generation;
    let active = true;
    let timer: number | undefined;
    function schedule(): void {
      window.clearTimeout(timer);
      if (!active || generation !== current.current.generation || !running()) return;
      const selection = current.current.game.selection;
      const delay =
        selection.kind === SelectionKind.mismatch
          ? Math.min(CLOCK_INTERVAL_MS, selection.remainingMs)
          : CLOCK_INTERVAL_MS;
      timer = window.setTimeout(() => {
        if (!active) return;
        synchronize(generation);
        schedule();
      }, delay);
    }
    function visibilityChanged(): void {
      if (!active || generation !== current.current.generation) return;
      synchronize(generation);
      visible.current = !document.hidden;
      schedule();
    }
    schedule();
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      active = false;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [session.generation, session.game.started, session.paused, won, suspended]);

  return {
    synchronize,
    reset: () => {
      clock.current = createClock(performance.now());
    },
  };
}
