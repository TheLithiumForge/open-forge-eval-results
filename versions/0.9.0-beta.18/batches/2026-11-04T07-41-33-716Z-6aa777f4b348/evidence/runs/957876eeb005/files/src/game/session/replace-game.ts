import { createGame } from '../create-game.ts';
import { isWon } from '../is-won.ts';
import { decodeSnapshot } from '../snapshot.ts';
import type { GameState } from '../state.ts';
import { announce } from './session-state.ts';
import type { SessionState } from './session-state.ts';

export function replaceGame(session: SessionState, game: GameState, now: number, paused = false): SessionState {
  return {
    ...session, game, paused, atMs: now, celebrate: false, dealId: session.dealId + 1,
    preferences: { ...session.preferences, size: game.board.size }, loadStatus: '',
    announcement: { id: session.announcement.id, text: '' },
  };
}

function loadStatus(session: SessionState, text: string): SessionState {
  return announce({ ...session, loadStatus: text }, text);
}

export function loadBoard(session: SessionState, text: string, now: number): SessionState {
  const game = createGame(text.trim());
  return game === null
    ? loadStatus(session, 'Invalid board code.')
    : loadStatus(replaceGame(session, game, now), 'Loaded board.');
}

export function loadSnapshot(session: SessionState, text: string, now: number): SessionState {
  const game = decodeSnapshot(text);
  if (game === null) return loadStatus(session, 'Invalid snapshot.');
  const completed = isWon(game);
  return loadStatus(replaceGame(session, game, now, !completed), completed
    ? 'Loaded completed snapshot.'
    : 'Loaded snapshot. Select Resume to continue.');
}
