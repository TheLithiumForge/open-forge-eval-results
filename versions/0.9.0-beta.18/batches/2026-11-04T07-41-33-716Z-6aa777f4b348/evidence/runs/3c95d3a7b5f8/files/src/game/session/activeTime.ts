import { advanceGame } from '../advanceGame.ts';
import type { GameState } from '../state.ts';

export interface SessionClock {
  atMs: number;
  visible: boolean;
}

export function sampleActiveGame(
  game: GameState, paused: boolean, clock: SessionClock, now: number,
): GameState {
  return clock.visible && !paused ? advanceGame(game, Math.max(0, now - clock.atMs)) : game;
}
