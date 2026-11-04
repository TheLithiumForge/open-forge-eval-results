import type { BoardSize } from "../board.ts";
import type { GameState } from "../state.ts";

export type SessionAnnouncement = Readonly<{ id: number; text: string }>;
export type GameSessionView = Readonly<{
  game: GameState;
  paused: boolean;
  dealId: number;
  bestMoves: number | null;
  celebrating: boolean;
  announcement: SessionAnnouncement | null;
}>;

export type GameSession = GameSessionView & Readonly<{
  activateCard(index: number): void;
  newGame(): void;
  restart(): void;
  changeSize(size: BoardSize): void;
  loadBoard(code: string): boolean;
  loadSnapshot(text: string): boolean;
  resume(): void;
  exportSnapshot(): string;
}>;
