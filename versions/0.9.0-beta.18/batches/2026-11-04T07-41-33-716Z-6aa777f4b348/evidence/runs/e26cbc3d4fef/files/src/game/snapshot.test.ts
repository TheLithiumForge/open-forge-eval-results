import { describe, expect, it } from 'vitest';
import { activateCard, advanceGame, createGame, MAX_ELAPSED_MS, MAX_MOVES } from './game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTE_LIMIT } from './snapshot.ts';
import { isWon } from './state.ts';
import { parseLimitedJson } from './validation.ts';

function snapshot(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' },
    moves: 0, elapsedMs: 0, started: false, ...overrides,
  });
}

describe('snapshot round trips', () => {
  it('preserves closed, one-card, matched and mismatch progress', () => {
    const initial = createGame('np1-4-1');
    const one = activateCard(initial, 0);
    const match = activateCard(one, 11);
    const mismatch = advanceGame(activateCard(activateCard(match, 1), 2), 500);
    for (const state of [initial, one, match, mismatch]) {
      expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    }
    expect(decodeSnapshot(snapshot({
      matched: [0, 11], selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
      moves: 2, elapsedMs: 1500, started: true,
    }))).toMatchObject({ matched: [0, 11], moves: 2, elapsedMs: 1500 });
  });

  it('accepts completion, cap values and permitted states without reconstructing their history', () => {
    const completed = decodeSnapshot(snapshot({
      matched: Array.from({ length: 16 }, (_, index) => index), moves: 8, started: true,
    }));
    expect(completed && isWon(completed)).toBe(true);
    expect(decodeSnapshot(snapshot({ moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS, started: true })))
      .not.toBeNull();
    expect(decodeSnapshot(snapshot({ moves: 1, elapsedMs: 0, started: true }))).not.toBeNull();
    expect(decodeSnapshot(snapshot({
      selection: { kind: 'one', index: 0 }, moves: 0, elapsedMs: 1000, started: true,
    }))).not.toBeNull();
  });

  it('exports readable exact-format JSON with whole milliseconds and positive mismatch remainder', () => {
    const state = advanceGame(activateCard(activateCard(createGame('np1-4-1'), 0), 1), 799.75);
    const text = encodeSnapshot(state);
    expect(text).toContain('\n  "version": 1');
    expect(decodeSnapshot(text)).toMatchObject({
      elapsedMs: 799, selection: { kind: 'mismatch', remainingMs: 1 },
    });
    const encoded: unknown = JSON.parse(text);
    expect(Object.keys(Object(encoded)).sort()).toEqual([
      'boardCode', 'elapsedMs', 'matched', 'moves', 'selection', 'started', 'version',
    ]);
    expect(state.selection).toMatchObject({ remainingMs: 0.25 });
  });
});

describe('snapshot rejection', () => {
  it.each([
    { version: 2 }, { boardCode: 'np1-4-01' }, { boardCode: ' np1-4-1' }, { extra: 1 },
    { started: 1 }, { moves: -1 }, { moves: 1.5 }, { moves: MAX_MOVES + 1 },
    { elapsedMs: -1 }, { elapsedMs: 0.1 }, { elapsedMs: MAX_ELAPSED_MS + 1 },
    { matched: [0] }, { matched: [0, 0] }, { matched: [0, 1] }, { matched: [0, 11, 16] },
    { matched: [-1, 11] }, { matched: [0, 11.1] }, { matched: null },
    { selection: null }, { selection: { kind: 'other' } }, { selection: { kind: 'closed', index: 0 } },
    { selection: { kind: 'one', index: 16 } }, { selection: { kind: 'one', index: -1 } },
    { selection: { kind: 'one', index: 0.5 } }, { selection: { kind: 'one', index: 0, extra: 0 } },
    { started: true }, { elapsedMs: 1 }, { moves: 1 },
    { selection: { kind: 'one', index: 0 } },
    { moves: 1, matched: [0, 11] },
  ])('rejects invalid field combination %j', (overrides) => {
    expect(decodeSnapshot(snapshot(overrides))).toBeNull();
  });

  it('requires exactly the stated top-level fields and valid JSON', () => {
    for (const key of ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started']) {
      const value: unknown = JSON.parse(snapshot());
      if (typeof value !== 'object' || value === null) throw new Error('Fixture must be an object.');
      const entries = Object.entries(value).filter(([name]) => name !== key);
      expect(decodeSnapshot(JSON.stringify(Object.fromEntries(entries)))).toBeNull();
    }
    for (const text of ['', '{', 'null', '[]', '1', '"snapshot"']) expect(decodeSnapshot(text)).toBeNull();
  });

  it.each([
    { kind: 'mismatch', first: 0, second: 0, remainingMs: 800 },
    { kind: 'mismatch', first: 0, second: 11, remainingMs: 800 },
    { kind: 'mismatch', first: 0, second: 1, remainingMs: 0 },
    { kind: 'mismatch', first: 0, second: 1, remainingMs: 801 },
    { kind: 'mismatch', first: 0, second: 1, remainingMs: 0.5 },
    { kind: 'mismatch', first: 0, second: 16, remainingMs: 800 },
    { kind: 'mismatch', first: 0, second: 1, remainingMs: 800, extra: 0 },
  ])('validates every mismatch constraint %j', (selection) => {
    expect(decodeSnapshot(snapshot({ selection, moves: 1, started: true }))).toBeNull();
  });

  it('rejects matched selections and insufficient moves', () => {
    for (const selection of [
      { kind: 'one', index: 0 },
      { kind: 'mismatch', first: 0, second: 1, remainingMs: 800 },
      { kind: 'mismatch', first: 1, second: 0, remainingMs: 800 },
    ]) {
      expect(decodeSnapshot(snapshot({ matched: [0, 11], selection, moves: 2, started: true }))).toBeNull();
    }
    expect(decodeSnapshot(snapshot({ matched: [0, 11], moves: 0, started: true }))).toBeNull();
    expect(decodeSnapshot(snapshot({
      matched: [0, 11], moves: 1, started: true,
      selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 800 },
    }))).toBeNull();
    expect(decodeSnapshot(snapshot({
      moves: 0, started: true, selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 800 },
    }))).toBeNull();
  });

  it('enforces the UTF-8 byte limit, including at its exact boundary', () => {
    const valid = snapshot();
    const boundary = valid + ' '.repeat(SNAPSHOT_BYTE_LIMIT - valid.length);
    expect(decodeSnapshot(boundary)).not.toBeNull();
    expect(decodeSnapshot(boundary + ' ')).toBeNull();
    expect(parseLimitedJson('"é"', 4)).toBe('é');
    expect(parseLimitedJson('"é"', 3)).toBeNull();
  });
});
