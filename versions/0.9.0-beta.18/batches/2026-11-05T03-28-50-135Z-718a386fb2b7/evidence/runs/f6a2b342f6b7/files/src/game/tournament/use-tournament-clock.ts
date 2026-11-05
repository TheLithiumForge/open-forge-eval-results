import { useEffect, useRef } from 'react';
import { advanceGame, isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { CLOCK_INTERVAL_MS, createClock, elapsedStep } from '../session/browser-clock.ts';
import type { RefObject } from 'react';
import type { Tournament } from './types.ts';

export function useTournamentClock(
  tournament: Tournament | null,
  enabled: boolean,
  current: RefObject<Tournament | null>,
  commit: (next: Tournament | null) => void,
) {
  const clock = useRef(createClock(performance.now()));
  const visible = useRef(!document.hidden);
  const won = tournament?.game ? isWon(tournament.game) : false;

  function running(): boolean {
    const game = current.current?.game;
    return enabled && visible.current && Boolean(game?.started && !isWon(game));
  }

  function synchronize(): void {
    const now = performance.now();
    const step = elapsedStep(clock.current, now, running());
    clock.current = step.clock;
    const active = current.current;
    if (step.milliseconds && active?.game) {
      const game = advanceGame(active.game, step.milliseconds);
      if (game !== active.game) commit({ ...active, game });
    }
  }

  useEffect(() => {
    clock.current = createClock(performance.now());
  }, [enabled]);

  useEffect(() => {
    const gameGeneration = tournament?.currentMatch;
    let active = true;
    let timer: number | undefined;
    function schedule(): void {
      window.clearTimeout(timer);
      const game = current.current?.game;
      if (!active || !running() || !game) return;
      const delay =
        game.selection.kind === SelectionKind.mismatch
          ? Math.min(CLOCK_INTERVAL_MS, game.selection.remainingMs)
          : CLOCK_INTERVAL_MS;
      timer = window.setTimeout(() => {
        if (!active) return;
        synchronize();
        schedule();
      }, delay);
    }
    function visibilityChanged(): void {
      if (!active || gameGeneration !== current.current?.currentMatch) return;
      synchronize();
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
  }, [
    enabled,
    tournament?.currentMatch,
    tournament?.currentTurn,
    tournament?.game?.boardCode,
    tournament?.game?.started,
    won,
  ]);

  return {
    synchronize,
    reset: () => {
      clock.current = createClock(performance.now());
    },
  };
}
