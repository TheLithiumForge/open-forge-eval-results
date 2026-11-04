import { createGame } from './state.ts';
import type { GameState } from './state.ts';
import { exactKeys, isRecord, validateMatched, validateSelection, validProgress } from './snapshotValidation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTES = 65536;

export function encodeSnapshot(state: GameState): string {
  const { board, matched, selection, moves, elapsedMs, started } = state;
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: board.code, matched, selection, moves, elapsedMs, started }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > SNAPSHOT_BYTES) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (!isRecord(value) || !exactKeys(value, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'])
      || value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string' || typeof value.started !== 'boolean'
      || typeof value.moves !== 'number' || typeof value.elapsedMs !== 'number') return null;
    const initial = createGame(value.boardCode);
    if (!initial || !validateMatched(value.matched, initial.board.deck)) return null;
    const partial = { ...initial, matched: value.matched, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
    const selection = validateSelection(value.selection, partial);
    if (!selection) return null;
    const state = { ...partial, selection };
    return validProgress(state) ? state : null;
  } catch { return null; }
}
