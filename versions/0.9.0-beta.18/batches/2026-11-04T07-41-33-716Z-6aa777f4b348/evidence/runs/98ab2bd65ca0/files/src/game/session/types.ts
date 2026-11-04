import type { BoardSize } from "../board/sizes.ts";
import type { GameState } from "../state.ts";
import type { StorageLike } from "./storage.ts";

export interface SessionAnnouncement {
  readonly id: number;
  readonly text: string;
}

export interface GameSessionView {
  readonly game: GameState;
  readonly size: BoardSize;
  readonly bestMoves: number | null;
  readonly dealRevision: number;
  readonly paused: boolean;
  readonly visible: boolean;
  readonly running: boolean;
  readonly pairCount: number;
  readonly totalPairs: number;
  readonly won: boolean;
  readonly celebrationId: number;
  readonly announcement: SessionAnnouncement | null;
  readonly status: string;
}

export interface SessionOptions {
  readonly now?: () => number;
  readonly storage?: StorageLike | null;
  readonly seedSource?: () => number;
}
