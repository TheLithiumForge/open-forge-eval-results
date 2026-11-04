import { describe, expect, it } from 'vitest';
import { activateCard, advanceGame, createGame } from './state';
import { decodeSnapshot, encodeSnapshot } from './snapshot';

describe('snapshots', () => {
  it('round trips an initial game and an active mismatch', () => {
    const initial = createGame('np1-4-1');
    expect(initial).not.toBeNull();
    if (!initial) return;
    expect(decodeSnapshot(encodeSnapshot(initial))).toEqual(initial);
    const mismatch = advanceGame(activateCard(activateCard(initial, 0), 1), 500);
    expect(decodeSnapshot(encodeSnapshot(mismatch))).toEqual(mismatch);
  });

  it('rejects unknown keys, incomplete matched pairs and inconsistent started states', () => {
    const base = { version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
    expect(decodeSnapshot(JSON.stringify({ ...base, extra: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, matched: [0, 1], moves: 1, started: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, started: true }))).toBeNull();
    expect(decodeSnapshot('{')).toBeNull();
  });

  it('rejects mismatches with matching faces or zero remaining time', () => {
    const base = { version: 1, boardCode: 'np1-4-1', matched: [], moves: 1, elapsedMs: 0, started: true };
    expect(decodeSnapshot(JSON.stringify({ ...base, selection: { kind: 'mismatch', first: 0, second: 11, remainingMs: 100 } }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...base, selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 0 } }))).toBeNull();
  });
});
