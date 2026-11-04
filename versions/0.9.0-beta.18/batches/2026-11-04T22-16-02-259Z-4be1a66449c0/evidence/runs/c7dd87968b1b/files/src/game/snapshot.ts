import { createGame } from './createGame.ts';
import { isWon } from './transitions.ts';
import { MOVE_LIMIT, TIME_LIMIT_MS, type GameState, type Selection } from './types.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function safeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function encodeSnapshot(state: GameState): string {
  const selection = state.selection;
  let savedSelection: Record<string, number | string>;
  if (selection.kind === 'closed') savedSelection = { kind: 'closed' };
  else if (selection.kind === 'one') savedSelection = { kind: 'one', index: selection.index };
  else savedSelection = { kind: 'mismatch', first: selection.first, second: selection.second, remainingMs: Math.max(1, selection.remainingMs) };
  return JSON.stringify({
    version: 1,
    boardCode: state.board.boardCode,
    matched: [...state.matched],
    selection: savedSelection,
    moves: state.moves,
    elapsedMs: state.elapsedMs,
    started: state.started,
  }, null, 2);
}

function decodeSelection(value: unknown, state: GameState, matched: Set<number>): Selection | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if (value.kind === 'closed') return exactKeys(value, ['kind']) ? { kind: 'closed' } : null;
  if (value.kind === 'one') {
    if (!exactKeys(value, ['kind', 'index']) || !safeInteger(value.index)) return null;
    if (value.index < 0 || value.index >= state.board.deck.length || matched.has(value.index)) return null;
    return { kind: 'one', index: value.index };
  }
  if (value.kind !== 'mismatch' || !exactKeys(value, ['kind', 'first', 'second', 'remainingMs'])) return null;
  if (!safeInteger(value.first) || !safeInteger(value.second) || !safeInteger(value.remainingMs)) return null;
  const { first, second, remainingMs } = value;
  if (first < 0 || second < 0 || first >= state.board.deck.length || second >= state.board.deck.length) return null;
  if (first === second || matched.has(first) || matched.has(second) || remainingMs < 1 || remainingMs > 800) return null;
  if (state.board.deck[first] === state.board.deck[second]) return null;
  return { kind: 'mismatch', first, second, remainingMs };
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > 65_536) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!isRecord(value) || !exactKeys(value, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'])) return null;
  if (value.version !== 1 || typeof value.boardCode !== 'string' || !Array.isArray(value.matched)) return null;
  if (!safeInteger(value.moves) || !safeInteger(value.elapsedMs) || typeof value.started !== 'boolean') return null;
  if (value.moves < 0 || value.moves > MOVE_LIMIT || value.elapsedMs < 0 || value.elapsedMs > TIME_LIMIT_MS) return null;
  const state = createGame(value.boardCode);
  if (!state) return null;
  const matched = new Set<number>();
  for (const index of value.matched) {
    if (!safeInteger(index) || index < 0 || index >= state.board.deck.length || matched.has(index)) return null;
    matched.add(index);
  }
  for (let index = 0; index < state.board.deck.length; index += 1) {
    const mate = state.board.deck.findIndex((face, position) => position !== index && face === state.board.deck[index]);
    if (matched.has(index) !== matched.has(mate)) return null;
  }
  const selection = decodeSelection(value.selection, state, matched);
  if (!selection) return null;
  const matchedPairs = matched.size / 2;
  const pendingMove = selection.kind === 'mismatch' ? 1 : 0;
  if (value.moves < matchedPairs + pendingMove) return null;
  if (!value.started && (value.moves !== 0 || value.elapsedMs !== 0 || matched.size !== 0 || selection.kind !== 'closed')) return null;
  if (value.started && value.moves === 0 && selection.kind !== 'one') return null;
  const restored: GameState = {
    ...state,
    matched: Object.freeze([...matched]),
    selection: Object.freeze(selection),
    moves: value.moves,
    elapsedMs: value.elapsedMs,
    started: value.started,
  };
  if (isWon(restored) && selection.kind !== 'closed') return null;
  return Object.freeze(restored);
}
