import { createGame, isWon, MAX_ELAPSED, MAX_MOVES, MISMATCH_MS } from './game';
import type { Game, Selection } from './game';
import { integer, keys, object, parseJSON } from './validation';
export function encodeSnapshot(game: Game): string {
  const selection = game.selection.kind === 'mismatch' ? { ...game.selection, remainingMs: Math.max(1, Math.ceil(game.selection.remainingMs)) } : game.selection;
  return JSON.stringify({ version: 1, boardCode: game.board.code, matched: game.matched, selection, moves: game.moves, elapsedMs: Math.floor(game.elapsedMs), started: game.started }, null, 2);
}
export function decodeSnapshot(text: string): Game | null {
  const data = parseJSON(text, 65536);
  if (!object(data) || !keys(data, ['version','boardCode','matched','selection','moves','elapsedMs','started']) || data.version !== 1 || typeof data.boardCode !== 'string') return null;
  const initial = createGame(data.boardCode);
  if (!initial || !Array.isArray(data.matched) || !object(data.selection) || !integer(data.moves, 0, MAX_MOVES) || !integer(data.elapsedMs, 0, MAX_ELAPSED) || typeof data.started !== 'boolean') return null;
  const length = initial.board.deck.length, matched: number[] = [];
  for (const index of data.matched) {
    if (!integer(index, 0, length - 1) || matched.includes(index)) return null;
    matched.push(index);
  }
  for (const index of matched) if (matched.filter(i => initial.board.deck[i] === initial.board.deck[index]).length !== 2) return null;
  const s = data.selection;
  const eligible = (x: unknown): x is number => integer(x, 0, length - 1) && !matched.includes(x);
  let selection: Selection;
  if (s.kind === 'closed' && keys(s, ['kind'])) selection = { kind: 'closed' };
  else if (s.kind === 'one' && keys(s, ['kind','index']) && eligible(s.index)) selection = { kind: 'one', index: s.index };
  else if (s.kind === 'mismatch' && keys(s, ['kind','first','second','remainingMs']) && eligible(s.first) && eligible(s.second) && s.first !== s.second && initial.board.deck[s.first] !== initial.board.deck[s.second] && integer(s.remainingMs, 1, MISMATCH_MS)) selection = { kind: 'mismatch', first: s.first, second: s.second, remainingMs: s.remainingMs };
  else return null;
  const game: Game = { ...initial, matched, selection, moves: data.moves, elapsedMs: data.elapsedMs, started: data.started };
  if (isWon(game) && selection.kind !== 'closed') return null;
  if (game.moves < matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0)) return null;
  if (!game.started && (game.moves !== 0 || game.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (game.started && game.moves === 0 && selection.kind !== 'one') return null;
  return game;
}
