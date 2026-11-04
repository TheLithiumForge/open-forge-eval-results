import type { GameState } from '../state.ts';
import type { Announcement } from './announcements.ts';
import { freshGame } from './deals.ts';
import { readPreferences } from './storage.ts';
import type { Preferences } from './storage.ts';

export interface SessionState {
  readonly game: GameState;
  readonly dealId: number;
  readonly paused: boolean;
  readonly celebrate: boolean;
  readonly preferences: Preferences;
  readonly announcement: Announcement;
  readonly loadStatus: string;
}

export function initialSession(): SessionState {
  const preferences = readPreferences();
  return {
    game: freshGame(preferences.size), dealId: 0, paused: false, celebrate: false,
    preferences, announcement: { id: 0, text: '' }, loadStatus: '',
  };
}
