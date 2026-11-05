import { useEffect, useRef } from 'react';
import { advanceGame, isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { CLOCK_INTERVAL_MS, createClock, elapsedStep } from '../session/browser-clock.ts';
import type { RefObject } from 'react';
import type { Tournament } from './rules.ts';

export function useTournamentClock(
  tournament: Tournament | null,
  current: RefObject<Tournament | null>,
  commit: (next: Tournament | null) => void,
  enabled: boolean,
) {
  const clock = useRef(createClock(performance.now()));
  const visible = useRef(!document.hidden);

  function running(): boolean {
    const active = current.current;
    return (
      enabled &&
      visible.current &&
      active?.phase === 'playing' &&
      !!active.currentGame?.started &&
      !isWon(active.currentGame)
    );
  }

  function synchronize(): void {
    const step = elapsedStep(clock.current, performance.now(), running());
    clock.current = step.clock;
    const active = current.current;
    if (!step.milliseconds || !active?.currentGame) return;
    commit({ ...active, currentGame: advanceGame(active.currentGame, step.milliseconds) });
  }

  useEffect(() => {
    let mounted = true;
    let timer: number | undefined;
    function schedule(): void {
      window.clearTimeout(timer);
      const value = current.current;
      if (!mounted || !running() || !value?.currentGame) return;
      const selection = value.currentGame.selection;
      const delay =
        selection.kind === SelectionKind.mismatch
          ? Math.min(CLOCK_INTERVAL_MS, selection.remainingMs)
          : CLOCK_INTERVAL_MS;
      timer = window.setTimeout(() => {
        if (!mounted) return;
        synchronize();
        schedule();
      }, delay);
    }
    function visibilityChanged(): void {
      if (!mounted) return;
      synchronize();
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
  }, [
    tournament?.currentMatchIndex,
    tournament?.currentTurn,
    tournament?.phase,
    tournament?.currentGame?.started,
    enabled,
  ]);

  return {
    synchronize,
    reset: () => {
      clock.current = createClock(performance.now());
    },
  };
}
