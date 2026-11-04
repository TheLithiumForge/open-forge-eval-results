import { createGame, isWon, KINDS, MAX_ELAPSED_MS, MAX_MOVES, MISMATCH_MS } from './state.ts';
import type { GameState, Selection } from './state.ts';
import { exactKeys, integer, isRecord, parseJson } from './validation.ts';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTES = 65536;

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify({ version: SNAPSHOT_VERSION, boardCode: state.board.code,
    matched: state.matched, selection: state.selection, moves: state.moves,
    elapsedMs: state.elapsedMs, started: state.started }, null, 2);
}

function decodeSelection(value: unknown, eligible: (index: unknown) => index is number): Selection | null {
  if (!isRecord(value)) return null;
  switch (value.kind) {
    case KINDS.closed:
      return exactKeys(value, ['kind']) ? { kind: KINDS.closed } : null;
    case KINDS.one:
      return exactKeys(value, ['kind', 'index']) && eligible(value.index)
        ? { kind: KINDS.one, index: value.index } : null;
    case KINDS.mismatch:
      return exactKeys(value, ['kind', 'first', 'second', 'remainingMs']) &&
        eligible(value.first) && eligible(value.second) && value.first !== value.second &&
        integer(value.remainingMs, MISMATCH_MS) && value.remainingMs >= 1
        ? { kind: KINDS.mismatch, first: value.first, second: value.second, remainingMs: value.remainingMs } : null;
    default: return null;
  }
}

export function decodeSnapshot(text: string): GameState | null {
  const data = parseJson(text, SNAPSHOT_BYTES);
  if (!isRecord(data) || !exactKeys(data, ['version', 'boardCode', 'matched', 'selection',
    'moves', 'elapsedMs', 'started']) || data.version !== SNAPSHOT_VERSION ||
    typeof data.boardCode !== 'string' || typeof data.started !== 'boolean' ||
    !integer(data.moves, MAX_MOVES) || !integer(data.elapsedMs, MAX_ELAPSED_MS) ||
    !Array.isArray(data.matched)) return null;
  const initial = createGame(data.boardCode);
  if (!initial) return null;
  const matched: number[] = [];
  for (const index of data.matched) {
    if (!integer(index, initial.deck.length - 1) || matched.includes(index)) return null;
    matched.push(index);
  }
  const faces = new Map<number, number>();
  for (const index of matched) {
    const face = initial.deck[index];
    if (face === undefined) return null;
    faces.set(face, (faces.get(face) ?? 0) + 1);
  }
  if ([...faces.values()].some(count => count !== 2)) return null;
  const eligible = (index: unknown): index is number =>
    integer(index, initial.deck.length - 1) && !matched.includes(index);
  const selection = decodeSelection(data.selection, eligible);
  if (!selection) return null;
  if (selection.kind === KINDS.mismatch && initial.deck[selection.first] === initial.deck[selection.second]) return null;
  const state: GameState = { ...initial, matched, selection, moves: data.moves,
    elapsedMs: data.elapsedMs, started: data.started };
  if (data.moves < matched.length / 2 + (selection.kind === KINDS.mismatch ? 1 : 0)) return null;
  if (isWon(state) && selection.kind !== KINDS.closed) return null;
  if (!data.started && (data.moves !== 0 || data.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== KINDS.closed)) return null;
  if (data.started && data.moves === 0 && selection.kind !== KINDS.one) return null;
  return state;
}
