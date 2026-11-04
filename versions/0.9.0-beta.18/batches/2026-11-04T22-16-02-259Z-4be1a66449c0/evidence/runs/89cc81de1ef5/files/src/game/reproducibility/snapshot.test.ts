import { describe, expect, it } from 'vitest';
import { activateCard, createGame } from '../core.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';

function mismatchSnapshot(): string {
  return JSON.stringify({
    version: 1, boardCode: 'np1-4-1', matched: [],
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 300 },
    moves: 1, elapsedMs: 1500, started: true,
  });
}

describe('snapshot format v1', () => {
  it('round trips an active mismatch and the documented fields', () => {
    const restored = decodeSnapshot(mismatchSnapshot());
    if (restored === null) throw new Error('Fixture snapshot should decode');
    expect(restored.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 300 });
    expect(decodeSnapshot(encodeSnapshot(restored))).toEqual(restored);
  });

  it('accepts only complete face pairs and consistent turn counters', () => {
    const valid = JSON.parse(mismatchSnapshot()) as Record<string, unknown>;
    expect(decodeSnapshot(JSON.stringify({ ...valid, matched: [0] }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...valid, moves: 0 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...valid, extra: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...valid, selection: { kind: 'mismatch', first: 0, second: 11, remainingMs: 1 } }))).toBeNull();
  });

  it('restores a starting game and rejects malformed or oversized input', () => {
    const game = createGame('np1-4-1');
    if (game === null) throw new Error('Fixture board should parse');
    expect(decodeSnapshot(encodeSnapshot(game))).toEqual(game);
    expect(decodeSnapshot('{')).toBeNull();
    expect(decodeSnapshot(' '.repeat(65537))).toBeNull();
    const played = activateCard(game, 0);
    expect(decodeSnapshot(encodeSnapshot(played))?.selection).toEqual({ kind: 'one', index: 0 });
  });
});
