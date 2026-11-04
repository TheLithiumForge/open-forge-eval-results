import { describe, expect, it } from 'vitest';
import { SIZES } from './boardCode.ts';
import { formatTime } from './formatTime.ts';
import { createGame, isWon } from './state.ts';
import type { GameState } from './state.ts';
import { activateCard, advanceGame, ELAPSED_CAP, MOVE_CAP } from './transitions.ts';

function initial(code = 'np1-4-1'): GameState {
  const game = createGame(code);
  if (!game) throw new Error('Invalid test board');
  return game;
}

function turn(game: GameState, first: number, second: number): GameState {
  return activateCard(activateCard(game, first), second);
}

describe('turn transitions', () => {
  it('starts on the first valid reveal and ignores repeated or invalid activation', () => {
    const game = initial();
    expect(advanceGame(game, 5000)).toBe(game);
    expect(activateCard(game, -1)).toBe(game);
    expect(activateCard(game, 16)).toBe(game);
    expect(activateCard(game, 1.5)).toBe(game);
    const revealed = activateCard(game, 0);
    expect(revealed).toMatchObject({ started: true, moves: 0, selection: { kind: 'one', index: 0 } });
    expect(activateCard(revealed, 0)).toBe(revealed);
    expect(game).toMatchObject({ started: false, selection: { kind: 'closed' } });
  });

  it('matches immediately, counts one move, and ignores matched cards', () => {
    const matched = turn(initial(), 0, 11);
    expect(matched).toMatchObject({ matched: [0, 11], moves: 1, selection: { kind: 'closed' } });
    expect(activateCard(matched, 11)).toBe(matched);
    const selected = activateCard(matched, 1);
    expect(activateCard(selected, 0)).toBe(selected);
  });

  it('ignores activation during a mismatch and closes both at exactly 800 active ms', () => {
    const mismatch = turn(initial(), 0, 1);
    expect(mismatch).toMatchObject({ moves: 1, selection: { kind: 'mismatch', remainingMs: 800 } });
    expect(activateCard(mismatch, 2)).toBe(mismatch);
    const waiting = advanceGame(mismatch, 799);
    expect(waiting.selection).toMatchObject({ kind: 'mismatch', remainingMs: 1 });
    expect(advanceGame(waiting, 1)).toMatchObject({ elapsedMs: 800, selection: { kind: 'closed' } });
    expect(activateCard(advanceGame(waiting, 1), 2).selection).toEqual({ kind: 'one', index: 2 });
  });

  it('preserves fractional active time independently of render frequency', () => {
    const game = turn(initial(), 0, 1);
    const stepped = advanceGame(advanceGame(game, 300.25), 499.75);
    expect(stepped).toEqual(advanceGame(game, 800));
    expect(advanceGame(game, 799.75).selection).toMatchObject({ remainingMs: 0.25 });
  });

  it('continues turns and mismatch timing after move and elapsed caps', () => {
    const game = { ...initial(), moves: MOVE_CAP, elapsedMs: ELAPSED_CAP, started: true };
    const mismatch = turn(game, 0, 1);
    expect(mismatch.moves).toBe(MOVE_CAP);
    const closed = advanceGame(mismatch, 800);
    expect(closed.selection).toEqual({ kind: 'closed' });
    expect(closed.elapsedMs).toBe(ELAPSED_CAP);
    expect(turn(closed, 0, 11).matched).toEqual([0, 11]);
  });

  it.each(SIZES)('completes every pair on a side-%i board', (size) => {
    let state = initial(`np1-${size}-1`);
    for (let face = 0; face < state.deck.length / 2; face += 1) {
      const positions = state.deck.flatMap((value, index) => value === face ? [index] : []);
      const first = positions[0];
      const second = positions[1];
      if (first === undefined || second === undefined) throw new Error('Missing pair');
      state = advanceGame(activateCard(state, first), 10);
      state = activateCard(state, second);
    }
    expect(isWon(state)).toBe(true);
    expect(state.moves).toBe(size * size / 2);
    expect(state.selection).toEqual({ kind: 'closed' });
    expect(advanceGame(state, 10_000)).toBe(state);
    expect(activateCard(state, 0)).toBe(state);
  });

  it('ignores invalid time and formats seconds without wrapping minutes', () => {
    const game = activateCard(initial(), 0);
    for (const time of [0, -1, NaN, Infinity]) expect(advanceGame(game, time)).toBe(game);
    expect(formatTime(999)).toBe('0:00');
    expect(formatTime(61_999)).toBe('1:01');
    expect(formatTime(3_600_000)).toBe('60:00');
    expect(formatTime(ELAPSED_CAP)).toBe('5999:59');
  });
});
