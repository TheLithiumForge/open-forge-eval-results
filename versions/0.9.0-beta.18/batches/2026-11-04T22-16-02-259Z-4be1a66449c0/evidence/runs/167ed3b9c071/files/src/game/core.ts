export const sizes = [4, 6, 8, 10, 12, 14, 16] as const;
export const mismatchMs = 800;
export const maxMoves = 999999;
export const maxElapsed = 359999999;
export type Selection = { kind: 'closed' } | { kind: 'one'; index: number } | { kind: 'mismatch'; first: number; second: number; remainingMs: number };
export type Game = { boardCode: string; size: number; deck: readonly number[]; matched: readonly number[]; selection: Selection; moves: number; elapsedMs: number; started: boolean };

export function parseBoardCode(code: string): { size: number; seed: number } | null {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(code);
  if (!match) return null;
  const size = Number(match[1]), seed = Number(match[2]);
  return Number.isSafeInteger(seed) && seed <= 2147483646 ? { size, seed } : null;
}
export function createGame(boardCode: string): Game | null {
  const parsed = parseBoardCode(boardCode);
  if (!parsed) return null;
  const { size, seed } = parsed;
  const deck = Array.from({ length: size * size }, (_, i) => Math.floor(i / 2));
  let random = seed;
  for (let i = deck.length - 1; i > 0; i--) {
    const b = i + 1, limit = Math.floor(2147483646 / b) * b;
    let x: number;
    do { random = random * 16807 % 2147483647; x = random - 1; } while (x >= limit);
    const j = x % b, a = deck[i], c = deck[j];
    if (a !== undefined && c !== undefined) { deck[i] = c; deck[j] = a; }
  }
  return { boardCode, size, deck, matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
}
export function isWon(game: Game): boolean { return game.matched.length === game.deck.length; }
export function activateCard(game: Game, index: number): Game {
  if (!Number.isInteger(index) || index < 0 || index >= game.deck.length || game.matched.includes(index) || isWon(game)) return game;
  const selection = game.selection;
  switch (selection.kind) {
    case 'closed': return { ...game, started: true, selection: { kind: 'one', index } };
    case 'mismatch': return game;
    case 'one': {
      if (index === selection.index) return game;
      const moves = Math.min(maxMoves, game.moves + 1);
      return game.deck[index] === game.deck[selection.index]
        ? { ...game, moves, matched: [...game.matched, selection.index, index], selection: { kind: 'closed' } }
        : { ...game, moves, selection: { kind: 'mismatch', first: selection.index, second: index, remainingMs: mismatchMs } };
    }
  }
}
export function advanceGame(game: Game, milliseconds: number): Game {
  if (!game.started || isWon(game) || milliseconds <= 0) return game;
  const selection = game.selection.kind === 'mismatch'
    ? milliseconds >= game.selection.remainingMs ? { kind: 'closed' } as const : { ...game.selection, remainingMs: game.selection.remainingMs - milliseconds }
    : game.selection;
  return { ...game, selection, elapsedMs: Math.min(maxElapsed, game.elapsedMs + milliseconds) };
}
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
