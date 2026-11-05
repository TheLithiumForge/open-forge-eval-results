import { useEffect, useRef } from 'react';
import { isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { advanceTournament } from '../tournament/rules.ts';
import type { TournamentState } from '../tournament/model.ts';
import type { RefObject } from 'react';
import { CLOCK_INTERVAL_MS, createClock, elapsedStep } from './browser-clock.ts';

export function useTournamentClock(
  state: TournamentState | null,
  generation: number,
  current: RefObject<TournamentState | null>,
  commit: (next: TournamentState) => void,
) {
  const clock = useRef(createClock(performance.now()));
  const visible = useRef(!document.hidden);
  const latestGeneration = useRef(generation);
  latestGeneration.current = generation;

  function running(): boolean {
    const game = current.current?.currentGame;
    return (
      visible.current &&
      current.current?.status === 'playing' &&
      Boolean(game?.started) &&
      Boolean(game && !isWon(game))
    );
  }

  function synchronize(expected = generation): void {
    if (expected !== latestGeneration.current) return;
    const step = elapsedStep(clock.current, performance.now(), running());
    clock.current = step.clock;
    const tournament = current.current;
    if (step.milliseconds && tournament) commit(advanceTournament(tournament, step.milliseconds));
  }

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    function schedule(): void {
      window.clearTimeout(timer);
      const tournament = current.current;
      if (!active || generation !== latestGeneration.current || !running() || !tournament) return;
      const selection = tournament.currentGame?.selection;
      const delay =
        selection?.kind === SelectionKind.mismatch
          ? Math.min(CLOCK_INTERVAL_MS, selection.remainingMs)
          : CLOCK_INTERVAL_MS;
      timer = window.setTimeout(() => {
        if (!active) return;
        synchronize(generation);
        schedule();
      }, delay);
    }
    function visibilityChanged(): void {
      if (!active || generation !== latestGeneration.current) return;
      synchronize(generation);
      visible.current = !document.hidden;
      schedule();
    }
    schedule();
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      if (generation === latestGeneration.current) synchronize(generation);
      active = false;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [generation, state?.status, state?.currentGame?.started]);

  return {
    reset: () => {
      clock.current = createClock(performance.now());
    },
    synchronize,
  };
}
