import { useEffect, useLayoutEffect, useRef } from 'react';
import { isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { CLOCK_INTERVAL_MS, createClock, elapsedStep } from './browser-clock.ts';
import { tickSession } from './session.ts';
import type { RefObject } from 'react';
import type { Play } from './session.ts';

// A null play has no game to time. An inactive clock belongs to a screen that isn't showing,
// so its game keeps the time it had when the screen was left.
export function useSessionClock<P extends Play>(
  session: P | null,
  current: RefObject<P | null>,
  commit: (next: P) => void,
  active: boolean,
) {
  const clock = useRef(createClock(performance.now()));
  const visible = useRef(!document.hidden);
  const shown = useRef(active);
  const won = session ? isWon(session.game) : false;

  function running(): boolean {
    const play = current.current;
    return (
      shown.current &&
      visible.current &&
      play !== null &&
      !play.paused &&
      play.game.started &&
      !isWon(play.game)
    );
  }

  function synchronize(generation = current.current?.generation): void {
    const play = current.current;
    if (!play || generation !== play.generation) return;
    const now = performance.now();
    const step = elapsedStep(clock.current, now, running());
    clock.current = step.clock;
    if (step.milliseconds) commit(tickSession(play, generation, step.milliseconds));
  }

  // Runs before the timer effect, so leaving counts time up to the switch and returning
  // starts a fresh observation.
  useLayoutEffect(() => {
    if (shown.current === active) return;
    if (active) clock.current = createClock(performance.now());
    else synchronize();
    shown.current = active;
  }, [active]);

  useEffect(() => {
    // A clock with no game or no screen has nothing to schedule or follow. It reads visibility
    // again when it starts following.
    if (!session || !active) return;
    visible.current = !document.hidden;
    const generation = session.generation;
    let live = true;
    let timer: number | undefined;
    function schedule(): void {
      window.clearTimeout(timer);
      const play = current.current;
      if (!live || !play || generation !== play.generation || !running()) return;
      const selection = play.game.selection;
      const delay =
        selection.kind === SelectionKind.mismatch
          ? Math.min(CLOCK_INTERVAL_MS, selection.remainingMs)
          : CLOCK_INTERVAL_MS;
      timer = window.setTimeout(() => {
        if (!live) return;
        synchronize(generation);
        schedule();
      }, delay);
    }
    function visibilityChanged(): void {
      if (!live || generation !== current.current?.generation) return;
      synchronize(generation);
      visible.current = !document.hidden;
      schedule();
    }
    schedule();
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      live = false;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [session?.generation, session?.game.started, session?.paused, won, active]);

  return {
    synchronize,
    reset: () => {
      clock.current = createClock(performance.now());
    },
  };
}
