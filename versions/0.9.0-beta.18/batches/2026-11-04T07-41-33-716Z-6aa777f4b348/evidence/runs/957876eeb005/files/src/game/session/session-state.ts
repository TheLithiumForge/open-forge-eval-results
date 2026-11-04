import type { GameState } from '../state.ts';
import type { Preferences } from './storage.ts';

export interface Announcement { readonly id: number; readonly text: string }
export interface SessionState {
  readonly game: GameState;
  readonly dealId: number;
  readonly paused: boolean;
  readonly celebrate: boolean;
  readonly announcement: Announcement;
  readonly loadStatus: string;
  readonly preferences: Preferences;
  readonly atMs: number;
  readonly visible: boolean;
}

export function initialSession(
  game: GameState, preferences: Preferences, atMs: number, visible: boolean,
): SessionState {
  return {
    game, preferences, atMs, visible, dealId: 0, paused: false, celebrate: false,
    announcement: { id: 0, text: '' }, loadStatus: '',
  };
}

export function announce(session: SessionState, text: string): SessionState {
  return { ...session, announcement: { id: session.announcement.id + 1, text } };
}
