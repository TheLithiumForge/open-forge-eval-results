import { advanceGame } from '../state.ts';
import type { GameState } from '../state.ts';

// This clock owns only its sampling anchor; game time remains in the pure core.
export function createActiveClock(atMs: number, visible: boolean) {
  let anchorMs = atMs;
  let shown = visible;

  function advance(game: GameState, paused: boolean, nowMs: number): GameState {
    const delta = shown && !paused ? Math.max(0, nowMs - anchorMs) : 0;
    anchorMs = nowMs;
    return advanceGame(game, delta);
  }

  return {
    advance,
    setVisible(game: GameState, paused: boolean, nowMs: number, nextVisible: boolean): GameState {
      const advanced = advance(game, paused, nowMs);
      shown = nextVisible;
      return advanced;
    },
    reset(nowMs: number, nextVisible: boolean): void {
      anchorMs = nowMs;
      shown = nextVisible;
    },
  };
}
