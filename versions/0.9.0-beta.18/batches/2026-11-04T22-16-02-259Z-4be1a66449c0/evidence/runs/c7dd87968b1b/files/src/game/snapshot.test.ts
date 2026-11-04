import { describe, expect, it } from 'vitest';
import { createGame } from './createGame.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { activateCard, advanceGame } from './transitions.ts';

function initialSnapshot(): Record<string, unknown> {
  const game = createGame('np1-4-1');
  if (!game) throw new Error('Invalid test deal');
  const value: unknown = JSON.parse(encodeSnapshot(game));
  if (!isRecord(value)) throw new Error('Invalid encoded snapshot');
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

describe('version 1 snapshots', () => {
  it('round trips a pending mismatch with its remaining time', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Invalid test deal');
    const pending = advanceGame(activateCard(activateCard(initial, 0), 1), 500);
    const restored = decodeSnapshot(encodeSnapshot(pending));
    expect(restored?.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 300 });
    expect(restored?.moves).toBe(1);
    expect(restored?.elapsedMs).toBe(500);
  });

  it('rejects unknown keys and invalid pair or selection data', () => {
    const valid = initialSnapshot();
    expect(decodeSnapshot(JSON.stringify({ ...valid, extra: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...valid, matched: [0] }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...valid, moves: -1 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...valid, selection: { kind: 'closed', index: 0 } }))).toBeNull();
  });

  it('applies the UTF-8 byte limit', () => {
    expect(decodeSnapshot('"' + 'é'.repeat(32_769) + '"')).toBeNull();
  });
});
