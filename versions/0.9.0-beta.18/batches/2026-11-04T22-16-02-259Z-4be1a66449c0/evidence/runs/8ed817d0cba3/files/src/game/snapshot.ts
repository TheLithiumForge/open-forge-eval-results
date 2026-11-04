import { createGame, isWon, MAX_MOVES, MAX_TIME, MISMATCH_MS } from './game.ts';
import type { Game, Selection } from './game.ts';
import { integer, keys, object, parseJSON } from './validation.ts';
export function encodeSnapshot(game: Game): string {
  const selection = game.selection.kind === 'mismatch' ? { ...game.selection, remainingMs: Math.max(1, Math.ceil(game.selection.remainingMs)) } : game.selection;
  return JSON.stringify({ version: 1, boardCode: game.board.code, matched: game.matched, selection, moves: game.moves, elapsedMs: Math.floor(game.elapsedMs), started: game.started }, null, 2);
}
export function decodeSnapshot(text: string): Game | null {
  const data = parseJSON(text, 65536);
  if (!object(data) || !keys(data, ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started']) || data.version !== 1 || typeof data.boardCode !== 'string') return null;
  const initial = createGame(data.boardCode);
  if (!initial || !Array.isArray(data.matched) || !integer(data.moves, MAX_MOVES) || !integer(data.elapsedMs, MAX_TIME) || typeof data.started !== 'boolean') return null;
  const deck = initial.board.deck, matched: number[] = [];
  for (const index of data.matched as unknown[]) {
    if (!integer(index, deck.length - 1) || matched.includes(index)) return null;
    matched.push(index);
  }
  for (const index of matched) if (matched.filter(i => deck[i] === deck[index]).length !== 2) return null;
  const raw = data.selection;
  if (!object(raw)) return null;
  const validIndex = (value: unknown): value is number => integer(value, deck.length - 1) && !matched.includes(value);
  let selection: Selection;
  if (raw.kind === 'closed' && keys(raw, ['kind'])) selection = { kind: 'closed' };
  else if (raw.kind === 'one' && keys(raw, ['kind', 'index']) && validIndex(raw.index)) selection = { kind: 'one', index: raw.index };
  else if (raw.kind === 'mismatch' && keys(raw, ['kind', 'first', 'second', 'remainingMs']) && validIndex(raw.first) && validIndex(raw.second) && raw.first !== raw.second && deck[raw.first] !== deck[raw.second] && integer(raw.remainingMs, MISMATCH_MS) && raw.remainingMs >= 1) selection = { kind: 'mismatch', first: raw.first, second: raw.second, remainingMs: raw.remainingMs };
  else return null;
  const game: Game = { ...initial, matched, selection, moves: data.moves, elapsedMs: data.elapsedMs, started: data.started };
  if (isWon(game) && selection.kind !== 'closed') return null;
  if (game.moves < matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0)) return null;
  if (!game.started && (game.moves !== 0 || game.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (game.started && game.moves === 0 && selection.kind !== 'one') return null;
  return game;
}
