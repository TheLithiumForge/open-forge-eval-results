import { useEffect, useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { advanceTournamentGame } from '../tournament/rules.ts';
import type { TournamentState } from '../tournament/model.ts';
import { CLOCK_INTERVAL_MS, createClock, elapsedStep } from './browser-clock.ts';
import type { RefObject } from 'react';

export function useTournamentClock(
  state: TournamentState | null,
  current: RefObject<TournamentState | null>,
  commit: (next: TournamentState) => void,
) {
  const clock = useRef(createClock(performance.now()));
  const visible = useRef(!document.hidden);
  const suspended = useRef(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const started = state?.activeGame?.started ?? false;
  const won = state?.activeGame ? isWon(state.activeGame) : false;

  function running(): boolean {
    const latest = current.current;
    return (
      visible.current &&
      !suspended.current &&
      !!latest?.turnRunning &&
      !!latest.activeGame?.started &&
      !isWon(latest.activeGame)
    );
  }

  function synchronize(): void {
    const step = elapsedStep(clock.current, performance.now(), running());
    clock.current = step.clock;
    const latest = current.current;
    if (step.milliseconds && latest) commit(advanceTournamentGame(latest, step.milliseconds));
  }

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    function schedule(): void {
      window.clearTimeout(timer);
      const latest = current.current;
      if (!active || !latest?.turnRunning || !latest.activeGame?.started || !running()) return;
      const selection = latest.activeGame.selection;
      const delay =
        selection.kind === SelectionKind.mismatch
          ? Math.min(CLOCK_INTERVAL_MS, selection.remainingMs)
          : CLOCK_INTERVAL_MS;
      timer = window.setTimeout(() => {
        if (!active) return;
        synchronize();
        schedule();
      }, delay);
    }
    function visibilityChanged(): void {
      if (!active) return;
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
  }, [state?.currentMatch, state?.currentTurn, state?.turnRunning, started, won, isSuspended]);

  return {
    synchronize,
    reset: () => {
      clock.current = createClock(performance.now());
    },
    pause: () => {
      synchronize();
      suspended.current = true;
      clock.current = createClock(performance.now());
      setIsSuspended(true);
    },
    resume: () => {
      clock.current = createClock(performance.now());
      suspended.current = false;
      setIsSuspended(false);
    },
  };
}
