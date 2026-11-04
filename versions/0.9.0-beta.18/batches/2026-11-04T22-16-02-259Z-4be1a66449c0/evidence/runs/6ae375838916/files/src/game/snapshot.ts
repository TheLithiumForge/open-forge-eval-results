import { createGame, isWon, MAX_MOVES, MAX_TIME, MISMATCH_MS } from './game.ts';
import type { Game, Selection } from './game.ts';
import { integer, keys, object, parseJson } from './validation.ts';
export function encodeSnapshot(game: Game): string {
  const s = game.selection;
  const selection = s.kind === 'mismatch' ? { ...s, remainingMs: Math.max(1, Math.ceil(s.remainingMs)) } : s;
  return JSON.stringify({ version: 1, boardCode: game.board.code, matched: game.matched, selection, moves: game.moves, elapsedMs: Math.floor(game.elapsedMs), started: game.started }, null, 2);
}
export function decodeSnapshot(text: string): Game | null {
  const data = parseJson(text, 65536);
  if (!object(data) || !keys(data, ['version','boardCode','matched','selection','moves','elapsedMs','started']) || data.version !== 1 || typeof data.boardCode !== 'string') return null;
  const game = createGame(data.boardCode);
  if (!game || !Array.isArray(data.matched) || !object(data.selection) || !integer(data.moves, 0, MAX_MOVES) || !integer(data.elapsedMs, 0, MAX_TIME) || typeof data.started !== 'boolean') return null;
  const matched: number[] = [];
  for (const index of data.matched) {
    if (!integer(index, 0, game.board.deck.length - 1) || matched.includes(index)) return null;
    matched.push(index);
  }
  const counts = new Map<number, number>();
  for (const index of matched) {
    const face = game.board.deck[index];
    if (face === undefined) return null;
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  if ([...counts.values()].some(count => count !== 2)) return null;
  const s = data.selection;
  const validIndex = (value: unknown): value is number => integer(value, 0, game.board.deck.length - 1) && !matched.includes(value);
  let selection: Selection;
  if (s.kind === 'closed' && keys(s, ['kind'])) selection = { kind: 'closed' };
  else if (s.kind === 'one' && keys(s, ['kind','index']) && validIndex(s.index)) selection = { kind: 'one', index: s.index };
  else if (s.kind === 'mismatch' && keys(s, ['kind','first','second','remainingMs']) && validIndex(s.first) && validIndex(s.second) && s.first !== s.second && game.board.deck[s.first] !== game.board.deck[s.second] && integer(s.remainingMs, 1, MISMATCH_MS)) selection = { kind: 'mismatch', first: s.first, second: s.second, remainingMs: s.remainingMs };
  else return null;
  if (data.moves < matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0)) return null;
  if (!data.started && (data.moves !== 0 || data.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (data.started && data.moves === 0 && selection.kind !== 'one') return null;
  const result = { ...game, matched, selection, moves: data.moves, elapsedMs: data.elapsedMs, started: data.started };
  return isWon(result) && selection.kind !== 'closed' ? null : result;
}
