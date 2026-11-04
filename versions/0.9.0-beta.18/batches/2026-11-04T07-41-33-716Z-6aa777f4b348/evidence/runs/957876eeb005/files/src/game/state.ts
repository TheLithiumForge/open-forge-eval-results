import type { Board } from './board-code.ts';
import type { Selection } from './selection.ts';

export interface GameState {
  readonly board: Board;
  readonly deck: readonly number[];
  readonly matched: readonly number[];
  readonly selection: Selection;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}
