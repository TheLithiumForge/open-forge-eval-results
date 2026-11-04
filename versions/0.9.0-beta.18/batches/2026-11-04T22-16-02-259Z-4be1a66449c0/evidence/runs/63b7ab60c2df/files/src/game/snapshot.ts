import { createGame, isWon, MAX_ELAPSED, MAX_MOVES, MISMATCH_MS } from './game.ts';
import type { Game, Selection } from './game.ts';
import { json, keys, natural, object } from './validation.ts';
export function encodeSnapshot(state: Game): string {
  const selection = state.selection.kind === 'mismatch' ? { ...state.selection, remainingMs: Math.max(1, Math.ceil(state.selection.remainingMs)) } : state.selection;
  return JSON.stringify({ version: 1, boardCode: state.boardCode, matched: state.matched, selection, moves: state.moves, elapsedMs: Math.floor(state.elapsedMs), started: state.started }, null, 2);
}
export function decodeSnapshot(text: string): Game | null {
  const data = json(text, 65536);
  if (!object(data) || !keys(data, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started']) || data.version !== 1 || typeof data.boardCode !== 'string') return null;
  const game = createGame(data.boardCode);
  if (!game || !Array.isArray(data.matched) || !object(data.selection) || !natural(data.moves) || data.moves > MAX_MOVES || !natural(data.elapsedMs) || data.elapsedMs > MAX_ELAPSED || typeof data.started !== 'boolean') return null;
  const matched: number[] = [];
  for (const index of data.matched) {
    if (!natural(index) || index >= game.deck.length || matched.includes(index)) return null;
    matched.push(index);
  }
  const counts = new Map<number, number>();
  for (const index of matched) { const face = game.deck[index]; if (face === undefined) return null; counts.set(face, (counts.get(face) ?? 0) + 1); }
  if ([...counts.values()].some(count => count !== 2)) return null;
  const s = data.selection;
  const validIndex = (n: unknown): n is number => natural(n) && n < game.deck.length && !matched.includes(n);
  let selection: Selection;
  if (s.kind === 'closed' && keys(s, ['kind'])) selection = { kind: 'closed' };
  else if (s.kind === 'one' && keys(s, ['kind', 'index']) && validIndex(s.index)) selection = { kind: 'one', index: s.index };
  else if (s.kind === 'mismatch' && keys(s, ['kind', 'first', 'second', 'remainingMs']) && validIndex(s.first) && validIndex(s.second) && s.first !== s.second && game.deck[s.first] !== game.deck[s.second] && natural(s.remainingMs) && s.remainingMs >= 1 && s.remainingMs <= MISMATCH_MS) selection = { kind: 'mismatch', first: s.first, second: s.second, remainingMs: s.remainingMs };
  else return null;
  const state = { ...game, matched, selection, moves: data.moves, elapsedMs: data.elapsedMs, started: data.started };
  if ((isWon(state) && selection.kind !== 'closed') || data.moves < matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0)) return null;
  if (!data.started && (data.moves !== 0 || data.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (data.started && data.moves === 0 && selection.kind !== 'one') return null;
  return state;
}
