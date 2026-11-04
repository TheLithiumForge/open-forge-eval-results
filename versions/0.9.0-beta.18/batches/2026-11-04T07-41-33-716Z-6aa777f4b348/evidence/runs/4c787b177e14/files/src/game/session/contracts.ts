import type { GameState, GridSize } from "../types.ts";
import type { BestScores } from "./storage.ts";

export type Notice = Readonly<{ text: string; revision: number }>;
export type GameSession = Readonly<{
  game: GameState;
  paused: boolean;
  dealRevision: number;
  celebration: boolean;
  bestScores: BestScores;
  notice: Notice;
  activate: (index: number) => void;
  newGame: () => void;
  restart: () => void;
  changeSize: (size: GridSize) => void;
  loadBoard: (draft: string) => boolean;
  loadSnapshot: (draft: string) => boolean;
  exportSnapshot: () => string;
  resume: () => void;
}>;
