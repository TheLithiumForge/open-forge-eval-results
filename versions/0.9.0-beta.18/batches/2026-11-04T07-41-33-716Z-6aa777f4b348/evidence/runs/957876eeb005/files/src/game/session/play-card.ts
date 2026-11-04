import { activateCard } from '../activate-card.ts';
import { formatTime } from '../format-time.ts';
import { isWon } from '../is-won.ts';
import { advanceSession } from './active-time.ts';
import { announce } from './session-state.ts';
import type { SessionState } from './session-state.ts';
import { rememberBest } from './storage.ts';

export function playCard(session: SessionState, index: number, now: number): SessionState {
  const advanced = advanceSession(session, now);
  if (advanced.paused || !advanced.visible) return advanced;
  const previous = advanced.game;
  const game = activateCard(previous, index);
  const next = { ...advanced, game };
  if (game === previous || previous.selection.kind !== 'one') return next;
  if (game.selection.kind === 'mismatch') {
    return announce(next, 'No match. Cards close after a short pause.');
  }
  const pairs = game.matched.length / 2;
  if (isWon(game)) {
    return announce({
      ...next, celebrate: true,
      preferences: rememberBest(next.preferences, game.board.size, game.moves),
    }, `Pair found. All pairs found in ${game.moves} moves and ${formatTime(game.elapsedMs)}.`);
  }
  return announce(next, `Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`);
}
