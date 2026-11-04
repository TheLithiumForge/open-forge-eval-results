import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { createGame } from './createGame.ts';
import { MAX_ELAPSED_MS, MAX_MOVES } from './state.ts';
import { activateCard, advanceGame } from './transitions.ts';

const initial = createGame('np1-4-1');
if (initial === null) throw new Error('Test board is invalid');

describe('version 1 snapshots', () => {
  it('round-trips a pending mismatch with its remaining active time', () => {
    let state = activateCard(initial, 1);
    state = activateCard(state, 2);
    state = advanceGame(state, 500);
    const encoded = encodeSnapshot(state);
    expect(encoded).toContain('\n');
    expect(decodeSnapshot(encoded)).toEqual(state);
  });

  it('accepts the documented maximums and requires complete face pairs', () => {
    const cap = {
      version: 1, boardCode: 'np1-4-1', matched: [],
      selection: { kind: 'one', index: 0 }, moves: MAX_MOVES, elapsedMs: MAX_ELAPSED_MS, started: true
    };
    expect(decodeSnapshot(JSON.stringify(cap))?.elapsedMs).toBe(MAX_ELAPSED_MS);
    expect(decodeSnapshot(JSON.stringify({ ...cap, moves: MAX_MOVES + 1 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...cap, elapsedMs: MAX_ELAPSED_MS + 1 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...cap, matched: [0] }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...cap, matched: [0, 11], moves: 1 }))).toBeNull();
  });

  it('rejects unknown keys, impossible selections and inconsistent start state', () => {
    const base = {
      version: 1, boardCode: 'np1-4-1', matched: [],
      selection: { kind: 'one', index: 0 }, moves: 0, elapsedMs: 0, started: true
    };
    const invalid = [
      { ...base, extra: true },
      { ...base, boardCode: 'np1-04-1' },
      { ...base, selection: { kind: 'one', index: 0, extra: 1 } },
      { ...base, selection: { kind: 'mismatch', first: 0, second: 11, remainingMs: 800 }, moves: 1 },
      { ...base, selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 801 }, moves: 1 },
      { ...base, selection: { kind: 'closed' } },
      { ...base, started: false, elapsedMs: 1 }
    ];
    for (const value of invalid) expect(decodeSnapshot(JSON.stringify(value))).toBeNull();
    expect(decodeSnapshot('{broken')).toBeNull();
    expect(decodeSnapshot('{"version":2}')).toBeNull();
  });

  it('enforces the UTF-8 byte limit including the exact boundary', () => {
    const valid = encodeSnapshot(initial);
    const padded = `${' '.repeat(65_536 - valid.length)}${valid}`;
    expect(new TextEncoder().encode(padded)).toHaveLength(65_536);
    expect(decodeSnapshot(padded)).not.toBeNull();
    expect(decodeSnapshot(` ${padded}`)).toBeNull();
  });
});
