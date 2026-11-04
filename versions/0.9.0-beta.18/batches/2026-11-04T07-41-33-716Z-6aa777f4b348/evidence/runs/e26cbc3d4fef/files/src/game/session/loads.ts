import { parseBoardCode } from '../boardCode.ts';
import { createGame } from '../game.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { isWon } from '../state.ts';
import { announce } from './announcements.ts';
import { replaceSession } from './sessionState.ts';
import type { SessionState } from './sessionState.ts';

function invalidLoad(session: SessionState, text: string): SessionState {
  return { ...session, loadStatus: text, announcement: announce(session.announcement, text) };
}

export function loadBoard(session: SessionState, draft: string): SessionState {
  const board = parseBoardCode(draft.trim());
  return board ? replaceSession(session, createGame(board.code), false, 'Loaded board.')
    : invalidLoad(session, 'Invalid board code.');
}

export function loadSnapshot(session: SessionState, draft: string): SessionState {
  const game = decodeSnapshot(draft);
  if (!game) return invalidLoad(session, 'Invalid snapshot.');
  const completed = isWon(game);
  return replaceSession(session, game, !completed, completed
    ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
}
