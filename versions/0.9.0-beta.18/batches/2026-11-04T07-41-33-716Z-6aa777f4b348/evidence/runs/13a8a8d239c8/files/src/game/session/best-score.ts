import type { MutableRefObject } from 'react';
import type { GridSize } from '../board.ts';
import type { GameState } from '../state.ts';
import { saveBestScore } from './storage.ts';

export function recordBestScore(
  game: GameState,
  bestRef: MutableRefObject<ReadonlyMap<GridSize, number>>,
  setBestScores: (value: ReadonlyMap<GridSize, number>) => void,
): void {
  const size = game.board.size;
  const existing = bestRef.current.get(size);
  if (existing !== undefined && existing <= game.moves) return;
  const next = new Map(bestRef.current);
  next.set(size, game.moves);
  bestRef.current = next;
  setBestScores(next);
  saveBestScore(size, game.moves);
}
