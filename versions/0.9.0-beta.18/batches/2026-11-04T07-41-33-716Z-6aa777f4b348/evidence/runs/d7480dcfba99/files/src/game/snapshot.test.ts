import { expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';

const example = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true };
const decode = (value: unknown) => decodeSnapshot(JSON.stringify(value));
it('round trips the documented snapshot without losing progress', () => {
  const state = decode(example);
  expect(state?.matched).toEqual([0, 11]);
  expect(state?.selection).toEqual(example.selection);
  if (!state) throw new Error('Snapshot failed');
  expect(JSON.parse(encodeSnapshot(state))).toEqual(example);
});
it.each([
  { ...example, extra: 1 }, { ...example, version: 2 }, { ...example, matched: [0] },
  { ...example, matched: [0, 0] }, { ...example, matched: [0, 1] }, { ...example, matched: [-1, 11] },
  { ...example, selection: { kind: 'one', index: 0 } },
  { ...example, selection: { kind: 'closed', index: 1 } },
  { ...example, selection: { kind: 'mismatch', first: 2, second: 6, remainingMs: 300 } },
  { ...example, selection: { kind: 'mismatch', first: 1, second: 1, remainingMs: 300 } },
  { ...example, selection: { ...example.selection, remainingMs: 0 } },
  { ...example, selection: { ...example.selection, remainingMs: 801 } },
  { ...example, selection: { ...example.selection, remainingMs: 1.5 } },
  { ...example, selection: { kind: 'unknown' } }, { ...example, moves: 1 },
  { ...example, moves: 1000000 }, { ...example, elapsedMs: 360000000 },
  { ...example, elapsedMs: -1 }, { ...example, moves: 2.5 },
  { ...example, started: false }, { ...example, started: 1 },
  { ...example, boardCode: ' np1-4-1' }, null, [], true,
])('rejects inconsistent or unknown data %#', value => expect(decode(value)).toBeNull());
it('enforces the startup constraints without reconstructing history', () => {
  const base = { version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
  expect(decode(base)).not.toBeNull();
  expect(decode({ ...base, started: true })).toBeNull();
  expect(decode({ ...base, started: true, selection: { kind: 'one', index: 0 } })).not.toBeNull();
  expect(decode({ ...base, started: true, moves: 99, elapsedMs: 10 })).not.toBeNull();
});
it('requires completion to be closed and accepts capped valid progress', () => {
  const matched = Array.from({ length: 16 }, (_, index) => index);
  const complete = { ...example, matched, selection: { kind: 'closed' }, moves: 8 };
  expect(decode(complete)).not.toBeNull();
  expect(decode({ ...complete, selection: { kind: 'one', index: 0 } })).toBeNull();
  expect(decode({ ...complete, moves: 999999, elapsedMs: 359999999 })).not.toBeNull();
});
it('checks UTF-8 bytes and malformed JSON', () => {
  expect(decodeSnapshot('{')).toBeNull();
  const text = JSON.stringify(example);
  expect(decodeSnapshot(text + ' '.repeat(65536 - text.length))).not.toBeNull();
  expect(decodeSnapshot(text + ' '.repeat(65537 - text.length))).toBeNull();
  expect(decodeSnapshot(JSON.stringify({ ...example, boardCode: 'é'.repeat(32768) }))).toBeNull();
});
it('exports whole milliseconds with a positive pending interval', () => {
  const state = decode(example);
  if (!state) throw new Error('Snapshot failed');
  const text = encodeSnapshot({ ...state, elapsedMs: 15.9,
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 0.1 } });
  expect(JSON.parse(text)).toMatchObject({ elapsedMs: 15, selection: { remainingMs: 1 } });
});
