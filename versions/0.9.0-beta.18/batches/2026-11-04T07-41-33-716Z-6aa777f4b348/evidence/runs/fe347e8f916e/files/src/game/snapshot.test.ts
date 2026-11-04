import { describe, expect, it } from 'vitest';
import { createGame } from './model.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_LIMIT } from './snapshot.ts';
import { activateCard, advanceGame } from './transitions.ts';

const example = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true };
const decode = (changes: Record<string, unknown>) => decodeSnapshot(JSON.stringify({ ...example, ...changes }));

describe('snapshot validation', () => {
  it('round trips the illustrative snapshot with canonical matched ordering', () => {
    const state = decodeSnapshot(JSON.stringify(example));
    expect(state).not.toBeNull();
    if (!state) throw new Error('Expected valid snapshot');
    expect(JSON.parse(encodeSnapshot(state))).toEqual(example);
    expect(advanceGame(state, 300).selection).toEqual({ kind: 'closed' });
  });
  it('round trips each turn phase, initial and completed states', () => {
    let state = createGame('np1-4-1');
    if (!state) throw new Error('Expected valid board');
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    state = activateCard(state, 0);
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    state = activateCard(state, 1);
    expect(decodeSnapshot(encodeSnapshot(state))).toEqual(state);
    const completed = decode({ matched: Array.from({ length: 16 }, (_, index) => index),
      selection: { kind: 'closed' }, moves: 8 });
    expect(completed?.matched).toHaveLength(16);
  });
  it.each([
    { version: 2 }, { extra: true }, { boardCode: 'np1-4-01' }, { matched: [0] },
    { matched: [0, 0] }, { matched: [0, 1] }, { matched: [0, 16] }, { matched: [-1, 11] },
    { matched: [0.5, 11] }, { moves: 1 }, { moves: 1000000 }, { moves: 2.1 },
    { moves: -1 }, { moves: '2' }, { elapsedMs: 360000000 }, { elapsedMs: -1 },
    { elapsedMs: 1.5 }, { elapsedMs: '0' }, { started: false }, { started: 1 },
    { selection: { kind: 'closed', index: 1 } }, { selection: { kind: 'one', index: 0 } },
    { selection: { kind: 'one', index: 16 } }, { selection: { kind: 'unknown' } },
    { selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 801 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1.5 } },
    { selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 1, extra: 2 } },
  ])('rejects inconsistent or unknown data %j', (changes) => expect(decode(changes)).toBeNull());
  it('checks the started and zero-move constraints without reconstructing history', () => {
    expect(decode({ matched: [], moves: 0, elapsedMs: 0, started: false,
      selection: { kind: 'closed' } })).not.toBeNull();
    expect(decode({ matched: [], moves: 0, started: true,
      selection: { kind: 'one', index: 3 } })).not.toBeNull();
    expect(decode({ matched: [], moves: 0, started: true, selection: { kind: 'closed' } })).toBeNull();
    expect(decode({ matched: [], moves: 0, started: false, elapsedMs: 0,
      selection: { kind: 'one', index: 3 } })).toBeNull();
    expect(decode({ matched: [], moves: 99, selection: { kind: 'closed' } })).not.toBeNull();
  });
  it('rejects missing fields, malformed JSON, arrays and inputs over the UTF-8 limit', () => {
    const { started: _started, ...missing } = example;
    for (const text of ['', '{', 'null', '[]', JSON.stringify(missing)]) expect(decodeSnapshot(text)).toBeNull();
    const text = JSON.stringify(example);
    expect(decodeSnapshot(text.padEnd(SNAPSHOT_LIMIT, ' '))).not.toBeNull();
    expect(decodeSnapshot(text.padEnd(SNAPSHOT_LIMIT + 1, ' '))).toBeNull();
  });
  it('exports whole milliseconds and never a zero remaining mismatch', () => {
    const state = decode({});
    if (!state || state.selection.kind !== 'mismatch') throw new Error('Expected mismatch');
    const json: unknown = JSON.parse(encodeSnapshot({ ...state, elapsedMs: 1234.9,
      selection: { ...state.selection, remainingMs: 0.1 } }));
    expect(json).toMatchObject({ elapsedMs: 1234, selection: { remainingMs: 1 } });
  });
});
