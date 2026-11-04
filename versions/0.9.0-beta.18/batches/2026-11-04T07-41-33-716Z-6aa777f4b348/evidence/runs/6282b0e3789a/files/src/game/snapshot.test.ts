import { describe, expect, it } from 'vitest';
import { activateCard } from './activateCard.ts';
import { advanceGame } from './advanceGame.ts';
import { createGame } from './createGame.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import type { GameState } from './state.ts';

const example = {
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};
const decode = (patch: Record<string, unknown> = {}) => decodeSnapshot(JSON.stringify({ ...example, ...patch }));

function initial(): GameState {
  const state = createGame('np1-4-1');
  if (!state) throw new Error('Invalid board.');
  return state;
}

describe('snapshot version 1', () => {
  it('restores the documented mismatch without changing its progress', () => {
    expect(decode()).toMatchObject({
      matched: [0, 11], moves: 2, elapsedMs: 1500, started: true,
      selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
    });
  });

  it('round trips closed, one-card, mismatch, matched and completed states', () => {
    const zero = initial();
    const one = activateCard(zero, 0);
    const mismatch = advanceGame(activateCard(one, 1), 300);
    const match = activateCard(one, 11);
    const won = { ...match, matched: Array.from({ length: 16 }, (_, index) => index), moves: 8 };
    for (const state of [zero, one, mismatch, match, won]) {
      expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    }
  });

  it('exports fractional browser time as whole milliseconds and a positive mismatch interval', () => {
    const pending = activateCard(activateCard(initial(), 0), 1);
    const restored = decodeSnapshot(encodeSnapshot(advanceGame(pending, 799.8)));
    expect(restored?.elapsedMs).toBe(799);
    expect(restored?.selection).toMatchObject({ kind: 'mismatch', remainingMs: 1 });
  });

  it.each([
    { version: 2 }, { extra: true }, { boardCode: ' np1-4-1' },
    { matched: [0] }, { matched: [0, 1] }, { matched: [0, 11, 11] },
    { matched: [-1, 16] }, { matched: [0.5, 11] }, { matched: '0,11' },
    { selection: { kind: 'closed', extra: 1 } },
    { selection: { kind: 'one', index: 0 } },
    { selection: { kind: 'one', index: 16 } },
    { selection: { kind: 'one', index: 2, extra: true } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 2, second: 6, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1.5 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1, extra: true } },
    { moves: 1 }, { moves: -1 }, { moves: 2.5 }, { moves: 1000000 },
    { elapsedMs: -1 }, { elapsedMs: 1.5 }, { elapsedMs: 360000000 },
    { started: false }, { started: 'true' }, { selection: { kind: 'other' } },
  ])('rejects inconsistent or extra data %j', patch => {
    expect(decode(patch)).toBeNull();
  });

  it('validates started zero-move states without reconstructing earlier history', () => {
    expect(decode({ matched: [], moves: 0, elapsedMs: 0, selection: { kind: 'one', index: 2 } })).not.toBeNull();
    expect(decode({ matched: [], moves: 0, selection: { kind: 'closed' } })).toBeNull();
    expect(decode({ matched: [], moves: 5, elapsedMs: 0, selection: { kind: 'closed' } })).not.toBeNull();
    expect(decode({ matched: [11, 0], moves: 1, selection: { kind: 'closed' } })).not.toBeNull();
    expect(decode({ matched: [], moves: 0, elapsedMs: 0, started: false, selection: { kind: 'closed' } })).not.toBeNull();
  });

  it('rejects malformed JSON, missing fields and UTF-8 byte overflow', () => {
    for (const text of ['{', 'null', '[]', '{}', JSON.stringify({ ...example, elapsedMs: undefined })]) {
      expect(decodeSnapshot(text)).toBeNull();
    }
    const valid = JSON.stringify(example);
    expect(decodeSnapshot(valid + ' '.repeat(65536 - valid.length))).not.toBeNull();
    expect(decodeSnapshot(valid + ' '.repeat(65537 - valid.length))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...example, note: 'é'.repeat(32768) }))).toBeNull();
  });
});
