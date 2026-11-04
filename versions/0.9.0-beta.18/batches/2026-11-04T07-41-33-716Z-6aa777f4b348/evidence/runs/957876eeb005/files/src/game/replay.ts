import { activateCard } from './activate-card.ts';
import { advanceGame } from './advance-game.ts';
import { decodeReplay } from './replay-input.ts';
import type { GameState } from './state.ts';

export function replayGame(text: string): GameState | null {
  const replay = decodeReplay(text);
  if (replay === null) return null;
  let state = replay.initial;
  let previous = 0;
  for (const action of replay.actions) {
    state = activateCard(advanceGame(state, action.atMs - previous), action.index);
    previous = action.atMs;
  }
  return advanceGame(state, replay.endMs - previous);
}
