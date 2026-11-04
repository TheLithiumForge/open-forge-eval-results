import { activateCard, advanceGame, createGame, isWon, maxElapsed, maxMoves } from './core.ts';
import type { Game, Selection } from './core.ts';

const object = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const keys = (x: Record<string, unknown>, expected: string[]) => Object.keys(x).length === expected.length && expected.every(k => Object.hasOwn(x, k));
const integer = (x: unknown, max = Number.MAX_SAFE_INTEGER): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0 && x <= max;
const parse = (text: string, limit: number): unknown => {
  if (new TextEncoder().encode(text).length > limit) return null;
  try { return JSON.parse(text) as unknown; } catch { return null; }
};
export function encodeSnapshot(game: Game): string {
  return JSON.stringify({ version: 1, boardCode: game.boardCode, matched: game.matched, selection: game.selection, moves: game.moves, elapsedMs: Math.floor(game.elapsedMs), started: game.started }, null, 2);
}
export function decodeSnapshot(text: string): Game | null {
  const x = parse(text, 65536);
  if (!object(x) || !keys(x, ['version','boardCode','matched','selection','moves','elapsedMs','started']) || x.version !== 1 || typeof x.boardCode !== 'string' || !Array.isArray(x.matched) || !object(x.selection) || !integer(x.moves, maxMoves) || !integer(x.elapsedMs, maxElapsed) || typeof x.started !== 'boolean') return null;
  const game = createGame(x.boardCode);
  if (!game) return null;
  const validIndex = (i: unknown): i is number => integer(i, game.deck.length - 1);
  const matched: number[] = [];
  for (const i of x.matched) { if (!validIndex(i) || matched.includes(i)) return null; matched.push(i); }
  for (const i of matched) if (matched.filter(j => game.deck[j] === game.deck[i]).length !== 2) return null;
  const s = x.selection;
  let selection: Selection;
  if (s.kind === 'closed' && keys(s, ['kind'])) selection = { kind: 'closed' };
  else if (s.kind === 'one' && keys(s, ['kind','index']) && validIndex(s.index) && !matched.includes(s.index)) selection = { kind: 'one', index: s.index };
  else if (s.kind === 'mismatch' && keys(s, ['kind','first','second','remainingMs']) && validIndex(s.first) && validIndex(s.second) && s.first !== s.second && !matched.includes(s.first) && !matched.includes(s.second) && game.deck[s.first] !== game.deck[s.second] && integer(s.remainingMs, 800) && s.remainingMs >= 1) selection = { kind: 'mismatch', first: s.first, second: s.second, remainingMs: s.remainingMs };
  else return null;
  if (x.moves < matched.length / 2 + (selection.kind === 'mismatch' ? 1 : 0) || (matched.length === game.deck.length && selection.kind !== 'closed')) return null;
  if (!x.started && (x.moves !== 0 || x.elapsedMs !== 0 || matched.length !== 0 || selection.kind !== 'closed')) return null;
  if (x.started && x.moves === 0 && selection.kind !== 'one') return null;
  return { ...game, matched, selection, moves: x.moves, elapsedMs: x.elapsedMs, started: x.started };
}
export function replayGame(text: string): Game | null {
  const x = parse(text, 1048576);
  if (!object(x) || !keys(x, ['version','boardCode','actions','endMs']) || x.version !== 1 || typeof x.boardCode !== 'string' || !Array.isArray(x.actions) || x.actions.length > 10000 || !integer(x.endMs)) return null;
  let game = createGame(x.boardCode), time = 0;
  if (!game) return null;
  for (const action of x.actions) {
    if (!object(action) || !keys(action, ['atMs','index']) || !integer(action.atMs) || !integer(action.index, game.deck.length - 1) || action.atMs < time || action.atMs > x.endMs) return null;
    game = activateCard(advanceGame(game, action.atMs - time), action.index);
    time = action.atMs;
  }
  return advanceGame(game, x.endMs - time);
}
