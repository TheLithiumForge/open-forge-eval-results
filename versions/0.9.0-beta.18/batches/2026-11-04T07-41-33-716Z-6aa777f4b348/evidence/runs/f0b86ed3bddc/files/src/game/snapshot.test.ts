import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_BYTE_LIMIT } from './snapshot.ts';
import { activateCard } from './activateCard.ts';
import { createGame } from './state.ts';

const example = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true };
const decode = (value: unknown) => decodeSnapshot(JSON.stringify(value));

describe('untrusted snapshots', () => {
  it('round trips the specified pending mismatch', () => {
    const restored = decode(example);
    expect(restored?.matched).toEqual([0, 11]);
    expect(restored?.selection).toEqual(example.selection);
    expect(restored && JSON.parse(encodeSnapshot(restored))).toEqual(example);
  });
  it('round trips initial and one-card states', () => {
    const initial = createGame('np1-4-1');
    expect(decodeSnapshot(encodeSnapshot(initial))).toEqual(initial);
    const one = activateCard(initial, 0);
    expect(decodeSnapshot(encodeSnapshot(one))).toEqual(one);
  });
  it('exports whole milliseconds and at least 1ms remaining', () => {
    const restored = decode(example);
    if (!restored) throw new Error('Example must be valid');
    const value: unknown = JSON.parse(encodeSnapshot({ ...restored, elapsedMs: 1500.9,
      selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0.1 } }));
    expect(value).toMatchObject({ elapsedMs: 1500, selection: { remainingMs: 1 } });
  });
  const invalid: unknown[] = [null, [], 4, { ...example, extra: true }, { ...example, version: 2 },
    { ...example, boardCode: ' np1-4-1' }, { ...example, matched: [0] }, { ...example, matched: [0, 0] },
    { ...example, matched: [0, 1] }, { ...example, matched: [0, 16] }, { ...example, matched: ['0', 11] },
    { ...example, selection: { kind: 'closed', index: 0 } },
    { ...example, selection: { kind: 'one', index: 0 } },
    { ...example, selection: { kind: 'one', index: 16 } },
    { ...example, selection: { kind: 'mismatch', first: 1, second: 9, remainingMs: 300 } },
    { ...example, selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
    ...[0, 801, 0.5, '1'].map(remainingMs => ({ ...example, selection: { ...example.selection, remainingMs } })),
    ...[-1, 1000000, 1.5, '2'].map(moves => ({ ...example, moves })),
    ...[-1, 360000000, 1.5, '1'].map(elapsedMs => ({ ...example, elapsedMs })),
    { ...example, moves: 1 }, { ...example, started: false }, { ...example, started: 'true' },
    { version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 1, started: true },
    { version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'one', index: 1 }, moves: 0, elapsedMs: 0, started: false },
  ];
  it.each(invalid.map((value, index) => ({ value, index })))('rejects invalid case $index', ({ value }) => {
    expect(decode(value)).toBeNull();
  });
  it('requires every key, rejects malformed JSON and enforces the UTF-8 byte limit', () => {
    for (const key of Object.keys(example)) {
      const value: Record<string, unknown> = { ...example };
      delete value[key];
      expect(decode(value)).toBeNull();
    }
    expect(decodeSnapshot('{')).toBeNull();
    expect(decodeSnapshot(' '.repeat(SNAPSHOT_BYTE_LIMIT) + JSON.stringify(example))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...example, extra: 'é'.repeat(33000) }))).toBeNull();
  });
  it('validates stated constraints without reconstructing history', () => {
    expect(decode({ ...example, selection: { kind: 'closed' }, moves: 999999, elapsedMs: 359999999 })).not.toBeNull();
  });
});
