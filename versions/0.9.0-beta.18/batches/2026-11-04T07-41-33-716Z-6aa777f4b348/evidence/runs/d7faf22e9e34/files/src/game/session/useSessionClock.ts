import { useEffect } from 'react';
import type { RefObject } from 'react';
import { isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import type { ActiveClock } from './activeTime.ts';
import type { SessionModel } from './sessionModel.ts';

const CLOCK_REFRESH_MS = 100;

export function useSessionClock(model: RefObject<SessionModel>, clock: RefObject<ActiveClock>,
  synchronize: () => GameState, revision: number, paused: boolean,
  selectionKind: GameState['selection']['kind']): void {
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const current = (): boolean => active && model.current.dealRevision === revision;
    function schedule(): void {
      const state = model.current;
      if (!current() || !clock.current.visible || state.paused || !state.game.started || isWon(state.game)) return;
      const delay = state.game.selection.kind === 'mismatch'
        ? Math.min(CLOCK_REFRESH_MS, state.game.selection.remainingMs) : CLOCK_REFRESH_MS;
      timer = setTimeout(tick, Math.max(1, delay));
    }
    function tick(): void {
      if (!current()) return;
      synchronize();
      schedule();
    }
    function visibilityChanged(): void {
      if (!current()) return;
      if (timer !== undefined) clearTimeout(timer);
      synchronize();
      clock.current = { atMs: performance.now(), visible: document.visibilityState !== 'hidden' };
      schedule();
    }
    document.addEventListener('visibilitychange', visibilityChanged);
    synchronize();
    schedule();
    return () => {
      active = false;
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [revision, paused, selectionKind]);
}
