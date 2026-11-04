import type { GameState } from '../state.ts';
import { advanceGame } from '../transitions.ts';

export interface ActiveClock { readonly atMs: number; readonly visible: boolean }

export function accountActiveTime(game: GameState, clock: ActiveClock, now: number, paused: boolean) {
  const atMs = Math.max(now, clock.atMs);
  return {
    game: clock.visible && !paused ? advanceGame(game, atMs - clock.atMs) : game,
    clock: { ...clock, atMs },
  };
}
