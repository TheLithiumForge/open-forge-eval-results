import { useEffect, useRef } from 'react';
import { isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { CLOCK_INTERVAL_MS, createClock, elapsedStep } from './browser-clock.ts';
import { tickSession } from './session.ts';
import type { RefObject } from 'react';
import type { PlaySession } from './session.ts';

// A game whose screen isn't shown keeps its state and counts no time, like a hidden page.
export function useSessionClock<S extends PlaySession>(
  session: S,
  current: RefObject<S>,
  commit: (next: S) => void,
  shown = true,
) {
  const clock = useRef(createClock(performance.now()));
  const visible = useRef(!document.hidden);
  const onScreen = useRef(shown);
  const won = isWon(session.game);

  function running(): boolean {
    return (
      onScreen.current &&
      visible.current &&
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

  // Counts the time up to a screen change before it starts or stops counting.
  useEffect(() => {
    if (onScreen.current === shown) return;
    synchronize();
    onScreen.current = shown;
    visible.current = !document.hidden;
  }, [shown]);

  useEffect(() => {
    if (!shown) return;
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
  }, [session.generation, session.game.started, session.paused, won, shown]);

  return {
    synchronize,
    reset: () => {
      clock.current = createClock(performance.now());
    },
  };
}
