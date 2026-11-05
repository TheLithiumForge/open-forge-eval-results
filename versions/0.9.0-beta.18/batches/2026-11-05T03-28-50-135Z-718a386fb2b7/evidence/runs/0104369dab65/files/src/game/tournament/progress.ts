import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { isJsonObject, hasExactKeys, parseJson } from '../saved-format.ts';
import type { GameState } from '../game.ts';

export function encodeProgress(game: GameState): string {
  return JSON.stringify({ elapsedMs: game.elapsedMs, snapshot: encodeSnapshot(game) });
}

export function decodeProgress(text: string): GameState | null {
  const value = parseJson(text);
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['elapsedMs', 'snapshot']) ||
    typeof value.snapshot !== 'string' ||
    typeof value.elapsedMs !== 'number' ||
    !Number.isFinite(value.elapsedMs)
  )
    return null;
  const game = decodeSnapshot(value.snapshot);
  if (
    !game ||
    value.elapsedMs < game.elapsedMs ||
    value.elapsedMs >= game.elapsedMs + 1 ||
    value.elapsedMs > 359999999
  )
    return null;
  return { ...game, elapsedMs: value.elapsedMs };
}
