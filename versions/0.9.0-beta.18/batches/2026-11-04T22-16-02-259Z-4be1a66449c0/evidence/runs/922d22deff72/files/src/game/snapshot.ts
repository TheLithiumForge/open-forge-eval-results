import { createGame, isWon, MAX_MOVES, MAX_TIME, MISMATCH_MS } from './state.ts';
import type { GameState, Selection } from './state.ts';
import { integer, keys, object, readJSON } from './validation.ts';
export function encodeSnapshot(state: GameState): string {
  const selection = state.selection.kind === 'mismatch' ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) } : state.selection;
  return JSON.stringify({ version: 1, boardCode: state.board.code, matched: state.matched, selection, moves: state.moves, elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}
export function decodeSnapshot(text: string): GameState | null {
  const v = readJSON(text, 65536);
  if (!object(v) || !keys(v, ['version','boardCode','matched','selection','moves','elapsedMs','started']) || v.version !== 1 || typeof v.boardCode !== 'string' || !Array.isArray(v.matched) || !integer(v.moves, MAX_MOVES) || !integer(v.elapsedMs, MAX_TIME) || typeof v.started !== 'boolean') return null;
  const base = createGame(v.boardCode);
  if (!base) return null;
  const matched: number[] = [];
  for (const item of v.matched) { if (!integer(item, base.board.deck.length - 1) || matched.includes(item)) return null; matched.push(item); }
  const counts = new Map<number, number>();
  for (const i of matched) { const face = base.board.deck[i]; if (face === undefined) return null; counts.set(face, (counts.get(face) ?? 0) + 1); }
  if ([...counts.values()].some(count => count !== 2)) return null;
  const s = v.selection;
  if (!object(s)) return null;
  const validIndex = (i: unknown): i is number => integer(i, base.board.deck.length - 1) && !matched.includes(i);
  let selection: Selection;
  if (s.kind === 'closed' && keys(s, ['kind'])) selection = { kind: 'closed' };
  else if (s.kind === 'one' && keys(s, ['kind','index']) && validIndex(s.index)) selection = { kind: 'one', index: s.index };
  else if (s.kind === 'mismatch' && keys(s, ['kind','first','second','remainingMs']) && validIndex(s.first) && validIndex(s.second) && s.first !== s.second && base.board.deck[s.first] !== base.board.deck[s.second] && integer(s.remainingMs, MISMATCH_MS) && s.remainingMs > 0) selection = { kind: 'mismatch', first: s.first, second: s.second, remainingMs: s.remainingMs };
  else return null;
  const state: GameState = { ...base, matched, selection, moves: v.moves, elapsedMs: v.elapsedMs, started: v.started };
  if (isWon(state) && selection.kind !== 'closed') return null;
  if (v.moves < matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0)) return null;
  if (!v.started && (v.moves !== 0 || v.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (v.started && v.moves === 0 && selection.kind !== 'one') return null;
  return state;
}
