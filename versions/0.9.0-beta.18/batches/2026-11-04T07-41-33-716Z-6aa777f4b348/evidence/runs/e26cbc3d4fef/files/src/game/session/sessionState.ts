import { activateCard } from '../game.ts';
import { isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { announce, turnAnnouncement } from './announcements.ts';
import type { Announcement } from './announcements.ts';
import { recordBest } from './storage.ts';
import type { Preferences } from './storage.ts';

export interface SessionState {
  readonly game: GameState;
  readonly revision: number;
  readonly paused: boolean;
  readonly preferences: Preferences;
  readonly celebrate: boolean;
  readonly announcement: Announcement;
  readonly loadStatus: string;
}

export function initialSession(game: GameState, preferences: Preferences): SessionState {
  return {
    game, preferences, revision: 0, paused: false, celebrate: false,
    announcement: { id: 0, text: '' }, loadStatus: '',
  };
}

export function replaceSession(session: SessionState, game: GameState, paused = false, status = ''): SessionState {
  return {
    ...session, game, paused, revision: session.revision + 1, celebrate: false, loadStatus: status,
    preferences: { ...session.preferences, size: game.board.size },
    announcement: announce(session.announcement, status),
  };
}

export function activateSession(session: SessionState, index: number): SessionState {
  if (session.paused) return session;
  const game = activateCard(session.game, index);
  if (game === session.game) return session;
  const text = turnAnnouncement(session.game, game);
  const won = isWon(game);
  return {
    ...session, game, celebrate: won,
    preferences: won ? recordBest(session.preferences, game.board.size, game.moves) : session.preferences,
    announcement: text === null ? session.announcement : announce(session.announcement, text),
  };
}
