import type { GameState } from '../state.ts';
import type { Announcement } from './announcements.ts';
import { freshGame } from './seed.ts';
import { readPreferences } from './storage.ts';
import type { Preferences } from './storage.ts';

export interface SessionModel {
  readonly game: GameState;
  readonly preferences: Preferences;
  readonly dealRevision: number;
  readonly paused: boolean;
  readonly celebrate: boolean;
  readonly announcement: Announcement;
  readonly loadStatus: string;
}

export function initialSession(): SessionModel {
  const preferences = readPreferences();
  return { game: freshGame(preferences.size), preferences, dealRevision: 0,
    paused: false, celebrate: false, announcement: { id: 0, text: '' }, loadStatus: '' };
}

export function announce(model: SessionModel, text: string): SessionModel {
  return { ...model, announcement: { id: model.announcement.id + 1, text } };
}

export function replaceGame(model: SessionModel, game: GameState, paused: boolean, status: string): SessionModel {
  const next: SessionModel = { ...model, game, paused, celebrate: false,
    dealRevision: model.dealRevision + 1, loadStatus: status,
    preferences: { ...model.preferences, size: game.board.size },
    announcement: { ...model.announcement, text: '' } };
  return status ? announce(next, status) : next;
}
