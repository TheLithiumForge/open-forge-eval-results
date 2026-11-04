import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';
import { createGame } from './game.ts';

const PROGRESS = {
  boardCode: 'np1-4-1',
  matched: [0, 11],
  selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
  moves: 2,
  elapsedMs: 1500,
  started: true,
};

test('both snapshot versions accept every top-level key in the first position', () => {
  for (const snapshot of [
    { version: 1, ...PROGRESS },
    { version: 2, name: 'Café', ...PROGRESS },
  ]) {
    const entries = Object.entries(snapshot);
    for (let offset = 0; offset < entries.length; offset++) {
      const reordered = Object.fromEntries([...entries.slice(offset), ...entries.slice(0, offset)]);
      assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), {
        ...createGame('np1-4-1'),
        ...PROGRESS,
        name: snapshot.version === 2 ? 'Café' : '',
      });
      assert.ok(decodeSnapshot(JSON.stringify(reordered)));
    }
  }
});

test('both snapshot versions require exact fields regardless of key order', () => {
  for (const snapshot of [
    { ...PROGRESS, version: 1 },
    { ...PROGRESS, name: 'Café', version: 2 },
  ]) {
    for (const key of Object.keys(snapshot)) {
      const missing = Object.fromEntries(
        Object.entries(snapshot).filter(([field]) => field !== key),
      );
      assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${key}`);
    }
    for (const extra of ['extra', 'deck', 'pairs', '__proto__'])
      assert.equal(decodeSnapshot(JSON.stringify({ [extra]: null, ...snapshot })), null, extra);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...PROGRESS, name: 'Café', version: 1 })), null);
  for (const version of [0, 3, '1', '2', null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...PROGRESS, version })), null);
});

test('named imports reject invalid names and retain all progress validation', () => {
  for (const name of ['', null, 7, {}, [], 'a'.repeat(41), 'a\rb', 'a\nb', '😀'.repeat(21)])
    assert.equal(decodeSnapshot(JSON.stringify({ ...PROGRESS, version: 2, name })), null);
  for (const invalid of [
    { moves: 1 },
    { elapsedMs: 359_999_999 + 1 },
    { moves: 999_999 + 1 },
    { started: false },
    { matched: [0] },
    { selection: { ...PROGRESS.selection, extra: true } },
  ])
    assert.equal(
      decodeSnapshot(JSON.stringify({ ...PROGRESS, version: 2, name: 'Café', ...invalid })),
      null,
    );
});
