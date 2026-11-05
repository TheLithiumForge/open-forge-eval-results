import { useEffect, useLayoutEffect, useRef } from 'react';
import { isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { CLOCK_INTERVAL_MS, createClock, elapsedStep } from './browser-clock.ts';
import type { GameState } from '../game.ts';
import type { RefObject } from 'react';

export interface ClockSession {
  readonly game: GameState | null;
  readonly paused: boolean;
  readonly generation: number;
}

export function useGameClock<S extends ClockSession>(
  session: S,
  current: RefObject<S>,
  commit: (next: S) => void,
  tick: (session: S, generation: number, milliseconds: number) => S,
  active = true,
) {
  const clock = useRef(createClock(performance.now()));
  const visible = useRef(!document.hidden);
  const foreground = useRef(active);
  const won = session.game ? isWon(session.game) : false;

  function running(): boolean {
    const latest = current.current;
    return (
      foreground.current &&
      visible.current &&
      !latest.paused &&
      latest.game !== null &&
      latest.game.started &&
      !isWon(latest.game)
    );
  }

  function synchronize(generation = current.current.generation): void {
    if (generation !== current.current.generation) return;
    const step = elapsedStep(clock.current, performance.now(), running());
    clock.current = step.clock;
    if (step.milliseconds) commit(tick(current.current, generation, step.milliseconds));
  }

  useLayoutEffect(() => {
    if (foreground.current === active) return;
    synchronize();
    foreground.current = active;
  }, [active]);

  useEffect(() => {
    const generation = session.generation;
    let mounted = true;
    let timer: number | undefined;
    function schedule(): void {
      window.clearTimeout(timer);
      if (!mounted || generation !== current.current.generation || !running()) return;
      const selection = current.current.game?.selection;
      const delay =
        selection?.kind === SelectionKind.mismatch
          ? Math.min(CLOCK_INTERVAL_MS, selection.remainingMs)
          : CLOCK_INTERVAL_MS;
      timer = window.setTimeout(() => {
        if (!mounted) return;
        synchronize(generation);
        schedule();
      }, delay);
    }
    function visibilityChanged(): void {
      if (!mounted || generation !== current.current.generation) return;
      synchronize(generation);
      visible.current = !document.hidden;
      schedule();
    }
    schedule();
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [active, session.generation, session.game?.started, session.paused, won]);

  return {
    synchronize,
    reset: () => {
      clock.current = createClock(performance.now());
    },
  };
}
