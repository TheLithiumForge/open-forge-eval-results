import { createGame } from './createGame.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';
import { decodeReplay } from './replayFormat.ts';

export function replayGame(text: string): GameState | null {
  const replay = decodeReplay(text);
  if (replay === null) return null;
  let state = createGame(replay.boardCode);
  if (state === null) return null;
  let clock = 0;
  for (const action of replay.actions) {
    state = advanceGame(state, action.atMs - clock);
    state = activateCard(state, action.index);
    clock = action.atMs;
  }
  return advanceGame(state, replay.endMs - clock);
}
