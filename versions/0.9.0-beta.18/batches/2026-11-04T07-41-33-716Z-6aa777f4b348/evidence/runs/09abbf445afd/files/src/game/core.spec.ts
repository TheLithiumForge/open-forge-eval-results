import { describe, expect, it } from 'vitest';
import { parseBoardCode } from './boardCode.ts';
import { BOARD_SIZES } from './constants.ts';
import { generateDeck } from './deck.ts';
import { replayGame } from './replay.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { activateCard, advanceGame, createGame, isWon } from './transitions.ts';

describe('board codes and deals', () => {
  it('accepts only the documented canonical board code', () => {
    expect(parseBoardCode('np1-4-1')?.seed).toBe(1);
    expect(parseBoardCode('np1-16-2147483646')?.size).toBe(16);
    for (const code of [' np1-4-1', 'np1-4-1\n', 'np1-4-01', 'np1-5-1', 'np1-4-0', 'np1-4-2147483647']) {
      expect(parseBoardCode(code)).toBeNull();
    }
  });

  it('matches the published deck and gives every face exactly two positions', () => {
    const code = parseBoardCode('np1-4-1');
    if (code === null) throw new Error('Test board code must be valid.');
    expect(generateDeck(code)).toEqual([6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3]);
    const large = createGame('np1-16-2147483646');
    if (large === null) throw new Error('Test board must be valid.');
    expect(large.board.deck).toEqual(generateDeck(parseBoardCode('np1-16-2147483646') ?? code));
    expect(new Set(large.board.deck).size).toBe(128);
  });
});

describe('turns and time', () => {
  it('ignores repeated, matched and mismatch-window activations', () => {
    let state = createGame('np1-4-1');
    if (state === null) throw new Error('Test board must be valid.');
    state = activateCard(state, 0);
    expect(activateCard(state, 0)).toBe(state);
    state = activateCard(state, 1);
    expect(state.moves).toBe(1);
    expect(activateCard(state, 2)).toBe(state);
    state = advanceGame(state, 799);
    expect(state.selection.kind).toBe('mismatch');
    if (state.selection.kind === 'mismatch') expect(state.selection.remainingMs).toBe(1);
    state = advanceGame(state, 1);
    expect(state.selection.kind).toBe('closed');
    expect(state.elapsedMs).toBe(800);
  });

  it('caps moves while play continues', () => {
    const encoded = JSON.stringify({
      version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'one', index: 4 },
      moves: 999999, elapsedMs: 10, started: true,
    });
    let state = decodeSnapshot(encoded);
    if (state === null) throw new Error('Test snapshot must be valid.');
    state = activateCard(state, 5);
    expect(state.moves).toBe(999999);
    expect(state.matched).toEqual([4, 5]);
    expect(state.selection.kind).toBe('closed');
    expect(advanceGame(state, 100).elapsedMs).toBe(110);
    expect(isWon(state)).toBe(false);
  });

  it('completes each supported board and freezes its clock', () => {
    for (const size of BOARD_SIZES) {
      let state = createGame(`np1-${size}-1`);
      if (state === null) throw new Error('Test board must be valid.');
      const firstByFace = new Map<number, number>();
      for (let index = 0; index < state.board.deck.length; index += 1) {
        const face = state.board.deck[index];
        if (face === undefined) throw new Error('Test deck must be complete.');
        const first = firstByFace.get(face);
        if (first === undefined) {
          firstByFace.set(face, index);
        } else {
          state = activateCard(state, first);
          state = activateCard(state, index);
          state = advanceGame(state, 2.5);
        }
      }
      expect(isWon(state)).toBe(true);
      expect(state.matched.length).toBe(size * size);
      expect(advanceGame(state, 100).elapsedMs).toBe(state.elapsedMs);
    }
  });
});

describe('snapshots', () => {
  it('round trips progress and exports a pending mismatch with whole milliseconds', () => {
    let state = createGame('np1-4-1');
    if (state === null) throw new Error('Test board must be valid.');
    state = activateCard(state, 0);
    state = activateCard(state, 1);
    state = advanceGame(state, 230.5);
    const json = encodeSnapshot(state);
    const loaded = decodeSnapshot(json);
    expect(loaded?.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 570 });
    expect(loaded?.elapsedMs).toBe(230);
    expect(loaded?.matched).toEqual(state.matched);
  });

  it('rejects extra keys, partial pairs, bad counts and oversized UTF-8 input', () => {
    const base = { version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
    expect(decodeSnapshot(JSON.stringify({ ...base, extra: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, matched: [0] }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, version: 2 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, started: 1 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, moves: Number.MAX_SAFE_INTEGER + 1 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, elapsedMs: 359999999 + 1 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, started: true, selection: { kind: 'closed' } }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, moves: 1 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, selection: { kind: 'one', index: 0, extra: true } }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, matched: [0, 11], moves: 1, started: true, selection: { kind: 'one', index: 0 } }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, matched: [0, 11, 0, 11], moves: 2, started: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, moves: 1, started: true, selection: { kind: 'mismatch', first: 0, second: 11, remainingMs: 0 } }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, moves: 1, started: true, selection: { kind: 'mismatch', first: 0, second: 11, remainingMs: 20 } }))).toBeNull();
    expect(decodeSnapshot(' '.repeat(65537))).toBeNull();
    expect(decodeSnapshot('é'.repeat(32769))).toBeNull();
  });
});

describe('replays', () => {
  it('runs the format example and resolves a mismatch at its exact deadline first', () => {
    const example = replayGame(JSON.stringify({
      version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 11 }], endMs: 800,
    }));
    expect(example?.matched).toEqual([0, 11]);
    expect(example?.moves).toBe(1);
    expect(example?.elapsedMs).toBe(800);
    const reverse = replayGame(JSON.stringify({
      version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 11 }, { atMs: 0, index: 0 }], endMs: 0,
    }));
    expect(reverse?.matched).toEqual([11, 0]);
    const delayedStart = replayGame(JSON.stringify({
      version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 500, index: 0 }], endMs: 700,
    }));
    expect(delayedStart?.elapsedMs).toBe(200);
    const boundary = replayGame(JSON.stringify({
      version: 1, boardCode: 'np1-4-1',
      actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }, { atMs: 800, index: 0 }, { atMs: 800, index: 1 }],
      endMs: 800,
    }));
    expect(boundary?.moves).toBe(2);
  });

  it('caps huge safe-integer timelines and rejects malformed actions', () => {
    const long = replayGame(JSON.stringify({
      version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0 }, { atMs: 0, index: 1 }], endMs: Number.MAX_SAFE_INTEGER,
    }));
    expect(long?.elapsedMs).toBe(359999999);
    expect(long?.selection.kind).toBe('closed');
    expect(replayGame(JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 2, index: 0 }, { atMs: 1, index: 1 }], endMs: 2 }))).toBeNull();
    expect(replayGame(JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 16 }], endMs: 0 }))).toBeNull();
    expect(replayGame(JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [{ atMs: 0, index: 0, extra: 1 }], endMs: 0 }))).toBeNull();
    expect(replayGame(JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: [], endMs: 0, extra: 1 }))).toBeNull();
    const tooMany = Array.from({ length: 10001 }, () => ({ atMs: 0, index: 0 }));
    expect(replayGame(JSON.stringify({ version: 1, boardCode: 'np1-4-1', actions: tooMany, endMs: 0 }))).toBeNull();
  });
});
