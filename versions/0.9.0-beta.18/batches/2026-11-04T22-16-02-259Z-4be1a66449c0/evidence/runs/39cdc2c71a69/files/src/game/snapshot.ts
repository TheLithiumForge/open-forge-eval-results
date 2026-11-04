import { createGame, isWon, MAX_MOVES, MAX_TIME, MISMATCH_MS } from './game.ts';
import type { Game, Selection } from './game.ts';
import { parseBoardCode } from './deck.ts';
import { integer, keys, object, parseJSON } from './validation.ts';
export function encodeSnapshot(game: Game): string {
  return JSON.stringify({ version: 1, boardCode: game.boardCode, matched: game.matched, selection: game.selection, moves: game.moves, elapsedMs: game.elapsedMs, started: game.started }, null, 2);
}
export function decodeSnapshot(text: string): Game | null {
  const data = parseJSON(text, 65536);
  if (!object(data) || !keys(data, ['version','boardCode','matched','selection','moves','elapsedMs','started']) || data.version !== 1 || typeof data.boardCode !== 'string' || !parseBoardCode(data.boardCode) || !Array.isArray(data.matched) || !integer(data.moves, MAX_MOVES) || !integer(data.elapsedMs, MAX_TIME) || typeof data.started !== 'boolean') return null;
  const base = createGame(data.boardCode), max = base.deck.length - 1;
  const matched: number[] = [];
  for (const index of data.matched as unknown[]) {
    if (!integer(index, max) || matched.includes(index)) return null;
    matched.push(index);
  }
  for (const index of matched) if (matched.filter(i => base.deck[i] === base.deck[index]).length !== 2) return null;
  const sel = data.selection;
  if (!object(sel)) return null;
  const eligible = (v: unknown): v is number => integer(v, max) && !matched.includes(v);
  let selection: Selection;
  if (sel.kind === 'closed' && keys(sel, ['kind'])) selection = { kind: 'closed' };
  else if (sel.kind === 'one' && keys(sel, ['kind','index']) && eligible(sel.index)) selection = { kind: 'one', index: sel.index };
  else if (sel.kind === 'mismatch' && keys(sel, ['kind','first','second','remainingMs']) && eligible(sel.first) && eligible(sel.second) && sel.first !== sel.second && base.deck[sel.first] !== base.deck[sel.second] && integer(sel.remainingMs, MISMATCH_MS) && sel.remainingMs > 0) selection = { kind: 'mismatch', first: sel.first, second: sel.second, remainingMs: sel.remainingMs };
  else return null;
  const game: Game = { ...base, matched, selection, moves: data.moves, elapsedMs: data.elapsedMs, started: data.started };
  if ((isWon(game) && selection.kind !== 'closed') || data.moves < matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0)) return null;
  if (!data.started && (data.moves !== 0 || data.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (data.started && data.moves === 0 && selection.kind !== 'one') return null;
  return game;
}
