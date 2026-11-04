import { describe, expect, it } from 'vitest';
import { createGame, activateCard, advanceGame, formatElapsedTime, isWon, MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';

describe('game turns and logical time', () => {
  it('starts on a valid reveal and ignores repeats and matched cards', () => {
    const start = createGame('np1-4-1');
    if (start === null) throw new Error('Expected a valid board.');
    const first = activateCard(start, 0);
    expect(first.started).toBe(true);
    expect(first.moves).toBe(0);
    expect(activateCard(first, 0)).toBe(first);
    const match = activateCard(first, 11);
    expect(match.moves).toBe(1);
    expect(match.matched).toEqual([0, 11]);
    expect(activateCard(match, 0)).toBe(match);
  });

  it('holds a mismatch for exactly 800 active milliseconds and ignores input', () => {
    const start = createGame('np1-4-1');
    if (start === null) throw new Error('Expected a valid board.');
    const first = activateCard(activateCard(start, 0), 1);
    expect(first.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 800 });
    expect(first.moves).toBe(1);
    expect(activateCard(first, 2)).toBe(first);
    const beforeClose = advanceGame(first, 799);
    expect(beforeClose.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
    expect(beforeClose.elapsedMs).toBe(799);
    const closed = advanceGame(beforeClose, 1);
    expect(closed.selection).toEqual({ kind: 'closed' });
    expect(closed.elapsedMs).toBe(800);
  });

  it('caps moves and elapsed time without stopping turns or mismatch closing', () => {
    const start = createGame('np1-4-1');
    if (start === null) throw new Error('Expected a valid board.');
    const cappedMoves = { ...start, moves: MAX_MOVES };
    const miss = activateCard(activateCard(cappedMoves, 0), 1);
    expect(miss.moves).toBe(MAX_MOVES);
    const cappedTime = advanceGame(activateCard(start, 0), Number.MAX_SAFE_INTEGER);
    expect(cappedTime.elapsedMs).toBe(MAX_ELAPSED_MS);
    const cappedMismatch = { ...miss, elapsedMs: MAX_ELAPSED_MS };
    expect(advanceGame(cappedMismatch, 800).selection.kind).toBe('closed');
  });

  it('derives victory and formats minutes beyond an hour', () => {
    const start = createGame('np1-4-1');
    if (start === null) throw new Error('Expected a valid board.');
    let finished = start;
    for (let position = 0; position < start.board.deck.length; position += 1) {
      if (finished.matched.includes(position)) continue;
      const mate = start.board.deck.findIndex((face, index) => index !== position && face === start.board.deck[position]);
      finished = activateCard(activateCard(finished, position), mate);
    }
    expect(isWon(finished)).toBe(true);
    expect(formatElapsedTime(3_600_000)).toBe('60:00');
    expect(formatElapsedTime(359_999_999)).toBe('5999:59');
  });
});
