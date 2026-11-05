import { useEffect, useRef } from 'react';
import { isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { CLOCK_INTERVAL_MS, createClock, elapsedStep } from './browser-clock.ts';
import { tickTournament } from '../competition/transitions.ts';
import type { RefObject } from 'react';
import type { TournamentState } from '../competition/types.ts';

export function useTournamentClock(
  active: boolean,
  tournament: TournamentState | null,
  current: RefObject<TournamentState | null>,
  commit: (next: TournamentState) => void,
) {
  const clock = useRef(createClock(performance.now()));
  const visible = useRef(!document.hidden);
  const activeRef = useRef(active);
  activeRef.current = active;
  const won = tournament ? isWon(tournament.game) : false;

  function running(): boolean {
    const latest = current.current;
    return Boolean(
      activeRef.current &&
        visible.current &&
        latest?.phase === 'playing' &&
        latest.game.started &&
        !isWon(latest.game),
    );
  }

  function synchronize(matchIndex?: number, turnIndex?: 0 | 1): void {
    const latest = current.current;
    if (matchIndex !== undefined && latest?.activeMatch !== matchIndex) return;
    if (turnIndex !== undefined && latest?.turnIndex !== turnIndex) return;
    const step = elapsedStep(clock.current, performance.now(), running());
    clock.current = step.clock;
    if (latest && step.milliseconds) commit(tickTournament(latest, step.milliseconds));
  }

  useEffect(() => {
    const matchIndex = tournament?.activeMatch;
    const turnIndex = tournament?.turnIndex;
    let listening = true;
    let timer: number | undefined;
    function schedule(): void {
      window.clearTimeout(timer);
      const latest = current.current;
      if (
        !listening ||
        matchIndex === undefined ||
        turnIndex === undefined ||
        !latest ||
        latest.activeMatch !== matchIndex ||
        latest.turnIndex !== turnIndex ||
        !running()
      )
        return;
      const selection = latest.game.selection;
      const delay =
        selection.kind === SelectionKind.mismatch
          ? Math.min(CLOCK_INTERVAL_MS, selection.remainingMs)
          : CLOCK_INTERVAL_MS;
      timer = window.setTimeout(() => {
        if (!listening) return;
        synchronize(matchIndex, turnIndex);
        schedule();
      }, delay);
    }
    function visibilityChanged(): void {
      if (!listening) return;
      synchronize(matchIndex, turnIndex);
      visible.current = !document.hidden;
      schedule();
    }
    schedule();
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      listening = false;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [
    active,
    tournament?.activeMatch,
    tournament?.turnIndex,
    tournament?.phase,
    tournament?.game.started,
    won,
  ]);

  return {
    synchronize: () => synchronize(),
    reset: () => {
      clock.current = createClock(performance.now());
    },
  };
}
