import { describe, expect, it } from 'vitest';
import { SIZES } from './boardCode.ts';
import { createGame, isWon } from './state.ts';
import { activateCard, advanceGame, MAX_ELAPSED_MS, MAX_MOVES } from './transitions.ts';
import { formatTime } from './time.ts';

function initial(code = 'np1-4-1') {
  const game = createGame(code);
  if (!game) throw new Error('Invalid test code');
  return game;
}

describe('turns and logical time', () => {
  it('counts only second valid reveals and matches immediately without mutation', () => {
    const game = initial();
    const one = activateCard(game, 0);
    expect(one.moves).toBe(0);
    expect(one.started).toBe(true);
    expect(activateCard(one, 0)).toBe(one);
    const pair = activateCard(one, 11);
    expect(pair.matched).toEqual([0, 11]);
    expect(pair.moves).toBe(1);
    expect(activateCard(pair, 11)).toBe(pair);
    expect(game.matched).toEqual([]);
    expect(game.started).toBe(false);
    expect(advanceGame(game, 1000)).toBe(game);
  });
  it('blocks mismatch activations and closes at exactly 800 active milliseconds', () => {
    const mismatch = activateCard(activateCard(initial(), 0), 1);
    expect(activateCard(mismatch, 2)).toBe(mismatch);
    const almost = advanceGame(mismatch, 799);
    expect(almost.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    expect(advanceGame(almost, 1).selection).toEqual({ kind: 'closed' });
    expect(mismatch.selection.kind).toBe('mismatch');
  });
  it.each(SIZES)('completes size %i and freezes the final clock', size => {
    let game = initial(`np1-${size}-1`);
    for (let face = 0; face < size * size / 2; face++) {
      const first = game.board.deck.indexOf(face);
      const second = game.board.deck.lastIndexOf(face);
      game = activateCard(advanceGame(activateCard(game, first), 10), second);
    }
    expect(isWon(game)).toBe(true);
    expect(game.moves).toBe(size * size / 2);
    expect(game.elapsedMs).toBe(size * size / 2 * 10);
    expect(advanceGame(game, 9000)).toBe(game);
  });
  it('continues matching and closing at both caps', () => {
    const capped = { ...activateCard(initial(), 0), moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS };
    expect(activateCard(capped, 11).matched).toEqual([0, 11]);
    expect(activateCard(capped, 11).moves).toBe(MAX_MOVES);
    const miss = advanceGame(activateCard(capped, 1), Number.MAX_SAFE_INTEGER);
    expect(miss.selection.kind).toBe('closed');
    expect(miss.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(formatTime(miss.elapsedMs)).toBe('5999:59');
    expect(formatTime(3600000)).toBe('60:00');
    expect(formatTime(1999)).toBe('0:01');
  });
  it('ignores invalid indices and deltas', () => {
    const game = initial();
    for (const index of [-1, 16, 0.5, NaN, Infinity]) expect(activateCard(game, index)).toBe(game);
    const started = activateCard(game, 0);
    for (const delta of [-1, NaN, Infinity, 0]) expect(advanceGame(started, delta)).toBe(started);
  });
});
