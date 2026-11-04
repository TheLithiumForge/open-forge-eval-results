import { createGame, isWon, MAX_MOVES, MAX_TIME, MISMATCH_MS } from './state.ts';
import type { GameState, Selection } from './state.ts';
import { integer, keys, object, parseJson } from './validation.ts';
export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === 'mismatch' ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) } : state.selection;
  return JSON.stringify({ version: 1, boardCode: state.boardCode, matched: state.matched, selection, moves: state.moves, elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}
export function decodeSnapshot(text: string): GameState | null {
  const data = parseJson(text, 65536);
  if (!object(data) || !keys(data, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started']) || data.version !== 1 || typeof data.boardCode !== 'string') return null;
  const initial = createGame(data.boardCode);
  if (!initial || !Array.isArray(data.matched) || !integer(data.moves, MAX_MOVES) || !integer(data.elapsedMs, MAX_TIME) || typeof data.started !== 'boolean' || !object(data.selection)) return null;
  const matched: number[] = [];
  for (const index of data.matched) {
    if (!integer(index, initial.deck.length - 1) || matched.includes(index)) return null;
    matched.push(index);
  }
  for (const index of matched) if (matched.filter(i => initial.deck[i] === initial.deck[index]).length !== 2) return null;
  const validIndex = (v: unknown): v is number => integer(v, initial.deck.length - 1) && !matched.includes(v);
  const s = data.selection;
  let selection: Selection;
  if (s.kind === 'closed' && keys(s, ['kind'])) selection = { kind: 'closed' };
  else if (s.kind === 'one' && keys(s, ['kind', 'index']) && validIndex(s.index)) selection = { kind: 'one', index: s.index };
  else if (s.kind === 'mismatch' && keys(s, ['kind', 'first', 'second', 'remainingMs']) && validIndex(s.first) && validIndex(s.second) && s.first !== s.second && initial.deck[s.first] !== initial.deck[s.second] && integer(s.remainingMs, MISMATCH_MS) && s.remainingMs >= 1) selection = { kind: 'mismatch', first: s.first, second: s.second, remainingMs: s.remainingMs };
  else return null;
  const state = { ...initial, matched, selection, moves: data.moves, elapsedMs: data.elapsedMs, started: data.started };
  if ((isWon(state) && selection.kind !== 'closed') || data.moves < matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0)) return null;
  if (!data.started && (data.moves !== 0 || data.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (data.started && data.moves === 0 && selection.kind !== 'one') return null;
  return state;
}
