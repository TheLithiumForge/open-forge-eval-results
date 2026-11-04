import { createGame, isWon, MAX_ELAPSED, MAX_MOVES, MISMATCH_MS } from './game.ts';
import type { GameState, Selection } from './game.ts';
import { parseBoardCode } from './boardCode.ts';
import { integer, keys, object, parseJson } from './validation.ts';
export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === 'mismatch' ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) } : state.selection;
  return JSON.stringify({ version: 1, boardCode: state.boardCode, matched: state.matched, selection, moves: state.moves, elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}
export function decodeSnapshot(text: string): GameState | null {
  const data = parseJson(text, 65536);
  if (!object(data) || !keys(data, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started']) || data.version !== 1 || typeof data.boardCode !== 'string' || !parseBoardCode(data.boardCode) || !Array.isArray(data.matched) || !object(data.selection) || !integer(data.moves, MAX_MOVES) || !integer(data.elapsedMs, MAX_ELAPSED) || typeof data.started !== 'boolean') return null;
  const state = createGame(data.boardCode); const max = state.deck.length - 1;
  const matched: number[] = [];
  for (const index of data.matched) { if (!integer(index, max) || matched.includes(index)) return null; matched.push(index); }
  const counts = new Map<number, number>();
  for (const index of matched) { const face = state.deck[index]; if (face === undefined) return null; counts.set(face, (counts.get(face) ?? 0) + 1); }
  if ([...counts.values()].some(count => count !== 2)) return null;
  const raw = data.selection; let selection: Selection;
  const eligible = (index: unknown): index is number => integer(index, max) && !matched.includes(index);
  if (raw.kind === 'closed' && keys(raw, ['kind'])) selection = { kind: 'closed' };
  else if (raw.kind === 'one' && keys(raw, ['kind', 'index']) && eligible(raw.index)) selection = { kind: 'one', index: raw.index };
  else if (raw.kind === 'mismatch' && keys(raw, ['kind', 'first', 'second', 'remainingMs']) && eligible(raw.first) && eligible(raw.second) && raw.first !== raw.second && state.deck[raw.first] !== state.deck[raw.second] && integer(raw.remainingMs, MISMATCH_MS) && raw.remainingMs > 0) selection = { kind: 'mismatch', first: raw.first, second: raw.second, remainingMs: raw.remainingMs };
  else return null;
  const result = { ...state, matched, selection, moves: data.moves, elapsedMs: data.elapsedMs, started: data.started };
  if (data.moves < matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0) || (isWon(result) && selection.kind !== 'closed')) return null;
  if (!data.started && (data.moves !== 0 || data.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (data.started && data.moves === 0 && selection.kind !== 'one') return null;
  return result;
}
