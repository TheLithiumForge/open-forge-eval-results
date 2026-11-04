import type { GameState } from '../state.ts';
import type { Announcement } from './announcements.ts';
import type { BestScores } from './storage.ts';

export type SessionState = Readonly<{
  game: GameState;
  bests: BestScores;
  paused: boolean;
  celebrate: boolean;
  resetId: number;
  announcement: Announcement;
  loadStatus: string;
}>;

export function initialSession(game: GameState, bests: BestScores): SessionState {
  return { game, bests, paused: false, celebrate: false, resetId: 0,
    announcement: { id: 0, text: '' }, loadStatus: '' };
}
