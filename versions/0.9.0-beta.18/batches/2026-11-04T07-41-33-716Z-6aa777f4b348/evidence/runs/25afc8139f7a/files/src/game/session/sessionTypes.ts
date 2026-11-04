import type { GameState } from '../state.ts';
import type { Preferences } from './storage.ts';

export type Session = Readonly<{
  game: GameState;
  preferences: Preferences;
  paused: boolean;
  dealId: number;
  celebrate: boolean;
  announcement: Readonly<{ id: number; text: string }>;
  loadStatus: string;
}>;
