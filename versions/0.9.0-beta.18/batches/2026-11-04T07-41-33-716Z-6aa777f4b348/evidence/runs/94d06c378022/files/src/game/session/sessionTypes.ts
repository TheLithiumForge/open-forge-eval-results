import type { BoardSize } from '../board.ts';
import type { GameState } from '../state.ts';

export interface Announcement {
  readonly id: number;
  readonly text: string;
}

export interface SessionView {
  readonly game: GameState;
  readonly dealId: number;
  readonly bestMoves: number | null;
  readonly paused: boolean;
  readonly celebration: boolean;
  readonly announcement: Announcement | null;
  readonly status: string;
}

export interface GameSession extends SessionView {
  readonly size: BoardSize;
  readonly activate: (index: number) => void;
  readonly newGame: () => void;
  readonly restart: () => void;
  readonly changeSize: (size: BoardSize) => void;
  readonly loadBoard: (draft: string) => boolean;
  readonly exportSnapshot: () => string;
  readonly loadSnapshot: (draft: string) => boolean;
  readonly resume: () => void;
}
