import type { GameState } from '../types.ts';

export type SessionAnnouncement = Readonly<{ id: number; text: string }>;
export type GameSession = Readonly<{
  state: GameState;
  paused: boolean;
  revision: number;
  best: number | null;
  celebration: boolean;
  announcement: SessionAnnouncement | null;
  loadStatus: string;
  activateCard: (index: number) => void;
  newGame: () => void;
  restart: () => void;
  changeSize: (size: number) => void;
  loadBoard: (draft: string) => boolean;
  loadSnapshot: (draft: string) => boolean;
  exportSnapshot: () => string;
  resume: () => void;
}>;
