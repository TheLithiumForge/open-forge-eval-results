import type { GameState, BoardSize } from "../types.ts";

export type SessionAnnouncement = Readonly<{ id: number; text: string }>;

export type GameSession = Readonly<{
  game: GameState;
  bestScore: number | null;
  isPaused: boolean;
  isCelebrating: boolean;
  boardRevision: number;
  announcement: SessionAnnouncement;
  loadStatus: string;
  activate(index: number): void;
  changeSize(size: BoardSize): void;
  newGame(): void;
  restart(): void;
  loadBoard(text: string): boolean;
  loadSnapshot(text: string): boolean;
  exportSnapshot(): string;
  resume(): void;
}>;
