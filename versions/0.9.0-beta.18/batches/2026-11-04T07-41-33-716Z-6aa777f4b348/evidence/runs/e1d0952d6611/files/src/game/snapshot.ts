import { createGame } from './state.ts';
import { isWon } from './transitions.ts';
import { SELECTION_KIND, MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS, type GameState, type Selection } from './state.ts';

const SNAPSHOT_VERSION = 1;
const SNAPSHOT_LIMIT = 65_536;
type Snapshot = Readonly<{ version: typeof SNAPSHOT_VERSION; boardCode: string; matched: readonly number[];
  selection: Selection; moves: number; elapsedMs: number; started: boolean }>;
type UnknownRecord = Record<string, unknown>;

function record(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function safeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function decodeSelection(value: unknown, state: GameState, matched: ReadonlySet<number>): Selection | null {
  if (!record(value) || typeof value.kind !== 'string') return null;
  if (value.kind === SELECTION_KIND.closed) return hasKeys(value, ['kind']) ? { kind: 'closed' } : null;
  if (value.kind === SELECTION_KIND.one) {
    if (!hasKeys(value, ['kind', 'index']) || !safeInteger(value.index) ||
        value.index >= state.board.deck.length || matched.has(value.index)) return null;
    return { kind: 'one', index: value.index };
  }
  if (value.kind !== SELECTION_KIND.mismatch || !hasKeys(value, ['kind', 'first', 'second', 'remainingMs']) ||
      !safeInteger(value.first) || !safeInteger(value.second) || !safeInteger(value.remainingMs) ||
      value.first >= state.board.deck.length || value.second >= state.board.deck.length ||
      value.first === value.second || matched.has(value.first) || matched.has(value.second) ||
      state.board.deck[value.first] === state.board.deck[value.second] ||
      value.remainingMs < 1 || value.remainingMs > MISMATCH_MS) return null;
  return { kind: 'mismatch', first: value.first, second: value.second, remainingMs: value.remainingMs };
}

function decodeObject(value: unknown): GameState | null {
  if (!record(value) || !hasKeys(value, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started']) ||
      value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== 'string' || !Array.isArray(value.matched) ||
      !safeInteger(value.moves) || value.moves > MAX_MOVES || !safeInteger(value.elapsedMs) ||
      value.elapsedMs > MAX_ELAPSED_MS || typeof value.started !== 'boolean') return null;
  const state = createGame(value.boardCode);
  if (state === null) return null;
  const matched = new Set<number>();
  for (const index of value.matched) {
    if (!safeInteger(index) || index >= state.board.deck.length || matched.has(index)) return null;
    matched.add(index);
  }
  for (const face of new Set(state.board.deck)) {
    const faceMatches = state.board.deck.flatMap((value, index) => value === face && matched.has(index) ? [index] : []);
    if (faceMatches.length !== 0 && faceMatches.length !== 2) return null;
  }
  const selection = decodeSelection(value.selection, state, matched);
  if (selection === null || (isWon({ ...state, matched: [...matched] }) && selection.kind !== 'closed')) return null;
  const pairs = matched.size / 2;
  const requiredMoves = pairs + (selection.kind === 'mismatch' ? 1 : 0);
  if (value.moves < requiredMoves) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.size !== 0 || selection.kind !== 'closed')) return null;
  if (value.started && value.moves === 0 && selection.kind !== 'one') return null;
  return { ...state, matched: [...matched], selection, moves: value.moves, elapsedMs: value.elapsedMs, started: value.started };
}

export function encodeSnapshot(state: GameState): string {
  const selection: Selection = state.selection.kind === 'mismatch'
    ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) } : state.selection;
  const snapshot: Snapshot = { version: SNAPSHOT_VERSION, boardCode: state.board.boardCode, matched: state.matched,
    selection, moves: state.moves, elapsedMs: Math.floor(state.elapsedMs), started: state.started };
  return JSON.stringify(snapshot, null, 2);
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).length > SNAPSHOT_LIMIT) return null;
  try {
    const value: unknown = JSON.parse(text);
    return decodeObject(value);
  } catch { return null; }
}
