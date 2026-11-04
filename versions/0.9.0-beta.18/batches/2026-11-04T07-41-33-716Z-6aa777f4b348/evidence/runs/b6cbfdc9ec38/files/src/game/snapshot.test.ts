import { describe, expect, it } from 'vitest';
import { advanceGame } from './advanceGame.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTE_LIMIT } from './snapshot.ts';
import { createGame } from './state.ts';

const progress = {
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};
const text = (changes: Record<string, unknown> = {}): string => JSON.stringify({ ...progress, ...changes });

describe('snapshot version 1', () => {
  it('round-trips all three selection states and full completed progress', () => {
    const initial = createGame('np1-4-1');
    if (!initial) throw new Error('Invalid fixture.');
    expect(decodeSnapshot(encodeSnapshot(initial))).toEqual(initial);
    for (const changes of [
      {}, { selection: { kind: 'closed' } }, { selection: { kind: 'one', index: 1 } },
      { matched: Array.from({ length: 16 }, (_, i) => i), selection: { kind: 'closed' }, moves: 8 },
    ]) {
      const state = decodeSnapshot(text(changes));
      expect(state).not.toBeNull();
      if (state) expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    }
  });

  it('exports whole milliseconds without mutating fractional progress', () => {
    const state = decodeSnapshot(text());
    if (!state) throw new Error('Invalid fixture.');
    const fraction = advanceGame(state, 299.75);
    const saved = decodeSnapshot(encodeSnapshot(fraction));
    expect(saved).toMatchObject({ elapsedMs: 1799, selection: { remainingMs: 1 } });
    expect(fraction).toMatchObject({ elapsedMs: 1799.75, selection: { remainingMs: 0.25 } });
  });

  it.each([
    { extra: true }, { version: 2 }, { boardCode: ' np1-4-1' }, { started: 'true' },
    { matched: [0] }, { matched: [0, 1] }, { matched: [0, 11, 0, 11] },
    { matched: [-1, 11] }, { matched: [0, 16] }, { matched: [0.5, 11] },
    { selection: { kind: 'closed', index: 1 } }, { selection: { kind: 'unknown' } },
    { selection: { kind: 'one', index: 0 } }, { selection: { kind: 'one', index: 16 } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 2, second: 6, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0.5 } },
    { moves: 1 }, { moves: -1 }, { moves: 1.5 }, { moves: 1000000 },
    { elapsedMs: -1 }, { elapsedMs: 1.5 }, { elapsedMs: 360000000 }, { started: false },
  ])('rejects invalid progress %j', (changes) => {
    expect(decodeSnapshot(text(changes))).toBeNull();
  });

  it('checks started/zero-move integrity without inventing history constraints', () => {
    const base = { matched: [], moves: 0, selection: { kind: 'one', index: 0 } };
    expect(decodeSnapshot(text(base))).not.toBeNull();
    expect(decodeSnapshot(text({ ...base, selection: { kind: 'closed' } }))).toBeNull();
    expect(decodeSnapshot(text({ ...base, started: false }))).toBeNull();
    expect(decodeSnapshot(text({ matched: [], selection: { kind: 'closed' }, moves: 1 }))).not.toBeNull();
    expect(decodeSnapshot(text({ moves: 999999, elapsedMs: 359999999 }))).not.toBeNull();
  });

  it('rejects malformed, incomplete, over-byte-limit and unknown-key input', () => {
    for (const invalid of ['', 'null', '[]', '{', '{}', text().replace('"moves":2,', '')]) {
      expect(decodeSnapshot(invalid)).toBeNull();
    }
    expect(decodeSnapshot(' '.repeat(SNAPSHOT_BYTE_LIMIT) + text())).toBeNull();
    expect(decodeSnapshot(text({ extra: 'é'.repeat(33000) }))).toBeNull();
  });
});
