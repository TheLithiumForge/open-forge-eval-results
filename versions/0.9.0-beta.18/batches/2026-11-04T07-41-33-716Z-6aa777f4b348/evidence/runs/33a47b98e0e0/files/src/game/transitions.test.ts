import { describe, expect, it } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';
import { advanceGame, activateCard } from './transitions.ts';
import { BOARD_SIZES } from './board.ts';
import { createGame, formatTime, GAME_LIMITS, isWon, matchedPairCount } from './state.ts';

describe('card transitions and logical time', () => {
  it('ignores repeated, matched, invalid, and mismatch-blocked activations', () => {
    const initial = createGame('np1-4-1');
    if (initial === null) throw new Error('Literal fixture must be valid');
    const one = activateCard(initial, 0);
    expect(activateCard(one, 0)).toBe(one);
    const mismatch = activateCard(one, 1);
    expect(mismatch.selection.kind).toBe('mismatch');
    expect(mismatch.moves).toBe(1);
    expect(activateCard(mismatch, 2)).toBe(mismatch);
    expect(activateCard(initial, -1)).toBe(initial);
    expect(activateCard(initial, 16)).toBe(initial);
  });

  it('starts the clock on the first valid reveal and keeps fractional time', () => {
    const initial = createGame('np1-4-1');
    if (initial === null) throw new Error('Literal fixture must be valid');
    expect(advanceGame(initial, 100).elapsedMs).toBe(0);
    const started = activateCard(initial, 0);
    expect(advanceGame(advanceGame(started, 0.4), 0.6).elapsedMs).toBe(1);
  });

  it('keeps a miss visible for exactly 800ms, then permits another reveal', () => {
    const game = createGame('np1-4-1');
    if (game === null) throw new Error('Literal fixture must be valid');
    const mismatch = activateCard(activateCard(game, 0), 1);
    const beforeClose = advanceGame(mismatch, 799);
    expect(beforeClose.selection.kind).toBe('mismatch');
    expect(activateCard(beforeClose, 2)).toBe(beforeClose);
    const closed = advanceGame(beforeClose, 1);
    expect(closed.selection.kind).toBe('closed');
    expect(activateCard(closed, 2).selection).toEqual({ kind: 'one', index: 2 });
    expect(closed.elapsedMs).toBe(800);
  });

  it('matches immediately and derives victory from all pairs', () => {
    for (const size of BOARD_SIZES) {
      let game = createGame(`np1-${size}-1`);
      if (game === null) throw new Error('Literal fixture must be valid');
      for (let face = 0; face < game.deck.length / 2; face += 1) {
        const first = game.deck.indexOf(face);
        const second = game.deck.lastIndexOf(face);
        game = activateCard(activateCard(game, first), second);
      }
      expect(isWon(game), `${size}x${size}`).toBe(true);
      expect(matchedPairCount(game)).toBe(size * size / 2);
      expect(game.moves).toBe(size * size / 2);
      expect(game.selection.kind).toBe('closed');
      expect(advanceGame(game, 1000)).toBe(game);
    }
  });

  it('ignores a matched card and continues playing at the move cap', () => {
    const fixture = {
      version: 1, boardCode: 'np1-4-1', matched: [0, 11], selection: { kind: 'closed' },
      moves: 1, elapsedMs: 0, started: true,
    };
    const matched = decodeSnapshot(JSON.stringify(fixture));
    if (matched === null) throw new Error('Matched fixture must be valid');
    expect(activateCard(matched, 0)).toBe(matched);

    const nearWin = {
      ...fixture,
      matched: [0, 11, 1, 9, 2, 6, 3, 7, 4, 5, 8, 15, 10, 14],
      selection: { kind: 'one', index: 12 },
      moves: GAME_LIMITS.maxMoves,
    };
    const capped = decodeSnapshot(JSON.stringify(nearWin));
    if (capped === null) throw new Error('Move-cap fixture must be valid');
    const won = activateCard(capped, 13);
    expect(isWon(won)).toBe(true);
    expect(won.moves).toBe(GAME_LIMITS.maxMoves);
  });

  it('keeps closing mismatches after elapsed time has reached its cap', () => {
    const fixture = {
      version: 1, boardCode: 'np1-4-1', matched: [],
      selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 800 },
      moves: 1, elapsedMs: GAME_LIMITS.maxElapsedMs, started: true,
    };
    const capped = decodeSnapshot(JSON.stringify(fixture));
    if (capped === null) throw new Error('Elapsed-cap fixture must be valid');
    const waiting = advanceGame(capped, 799);
    expect(waiting.elapsedMs).toBe(GAME_LIMITS.maxElapsedMs);
    expect(waiting.selection).toMatchObject({ kind: 'mismatch', remainingMs: 1 });
    const closed = advanceGame(waiting, 1);
    expect(closed.elapsedMs).toBe(GAME_LIMITS.maxElapsedMs);
    expect(closed.selection.kind).toBe('closed');
  });

  it('formats elapsed time with unbounded minutes and floored seconds', () => {
    expect(formatTime(3_600_999)).toBe('60:00');
    expect(formatTime(125_999)).toBe('2:05');
  });
});
