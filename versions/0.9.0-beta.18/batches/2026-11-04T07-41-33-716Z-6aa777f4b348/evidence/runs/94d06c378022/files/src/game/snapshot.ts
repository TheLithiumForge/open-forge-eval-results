import { parseBoardCode } from './board.ts';
import { MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, SELECTION_KIND } from './state.ts';
import type { GameState, Selection } from './state.ts';
import { makeGameState } from './state.ts';
import { isWon } from './transitions.ts';

export const MAX_SNAPSHOT_BYTES = 65_536;
export const SNAPSHOT_VERSION = 1;
const SNAPSHOT_KEYS = ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function integerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

function decodeSelection(value: unknown, deck: readonly number[], matched: ReadonlySet<number>): Selection | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if (value.kind === SELECTION_KIND.closed && hasKeys(value, ['kind'])) return { kind: SELECTION_KIND.closed };
  if (value.kind === SELECTION_KIND.one && hasKeys(value, ['kind', 'index'])) {
    if (!integerInRange(value.index, 0, deck.length - 1) || matched.has(value.index)) return null;
    return { kind: SELECTION_KIND.one, index: value.index };
  }
  if (value.kind === SELECTION_KIND.mismatch && hasKeys(value, ['kind', 'first', 'second', 'remainingMs'])) {
    if (!integerInRange(value.first, 0, deck.length - 1) || !integerInRange(value.second, 0, deck.length - 1)) return null;
    if (value.first === value.second || matched.has(value.first) || matched.has(value.second)) return null;
    if (deck[value.first] === deck[value.second] || !integerInRange(value.remainingMs, 1, MISMATCH_MS)) return null;
    return { kind: SELECTION_KIND.mismatch, first: value.first, second: value.second, remainingMs: value.remainingMs };
  }
  return null;
}

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === SELECTION_KIND.mismatch
    ? { ...state.selection, remainingMs: Math.max(1, Math.floor(state.selection.remainingMs)) }
    : state.selection;
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    boardCode: state.board.code,
    matched: [...state.matched],
    selection,
    moves: Math.floor(state.moves),
    elapsedMs: Math.floor(state.elapsedMs),
    started: state.started
  }, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > MAX_SNAPSHOT_BYTES) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return null; }
  if (!isRecord(parsed) || !hasKeys(parsed, SNAPSHOT_KEYS) || parsed.version !== SNAPSHOT_VERSION || typeof parsed.boardCode !== 'string') return null;
  const board = parseBoardCode(parsed.boardCode);
  if (board === null || !Array.isArray(parsed.matched)) return null;
  const matched: number[] = [];
  const indices = new Set<number>();
  const faceCounts = new Map<number, number>();
  for (const index of parsed.matched) {
    if (!integerInRange(index, 0, board.deck.length - 1) || indices.has(index)) return null;
    indices.add(index);
    matched.push(index);
    const face = board.deck[index];
    if (face === undefined) return null;
    faceCounts.set(face, (faceCounts.get(face) ?? 0) + 1);
  }
  if ([...faceCounts.values()].some((count) => count !== 2)) return null;
  if (!integerInRange(parsed.moves, 0, MAX_MOVES) || !integerInRange(parsed.elapsedMs, 0, MAX_ELAPSED_MS) || typeof parsed.started !== 'boolean') return null;
  const selection = decodeSelection(parsed.selection, board.deck, indices);
  if (selection === null) return null;
  const complete = matched.length === board.deck.length;
  if (complete && selection.kind !== SELECTION_KIND.closed) return null;
  const matchedPairs = matched.length / 2;
  if (parsed.moves < matchedPairs + (selection.kind === SELECTION_KIND.mismatch ? 1 : 0)) return null;
  if (!parsed.started && (parsed.moves !== 0 || parsed.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== SELECTION_KIND.closed)) return null;
  if (parsed.started && parsed.moves === 0 && selection.kind !== SELECTION_KIND.one) return null;
  const state = makeGameState(board, matched, selection, parsed.moves, parsed.elapsedMs, parsed.started);
  return isWon(state) === complete ? state : null;
}
