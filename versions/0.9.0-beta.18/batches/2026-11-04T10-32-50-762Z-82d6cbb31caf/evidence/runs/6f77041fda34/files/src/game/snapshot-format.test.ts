import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_MAX_BYTES } from './snapshot.ts';

const UNNAMED = {
  version: 1,
  boardCode: 'np1-4-1',
  matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2,
  elapsedMs: 1500,
  started: true,
};
const NAMED = { ...UNNAMED, version: 2, name: '  Café 🃏  ' };

test('both snapshot versions accept reordered top-level and selection keys', () => {
  for (const snapshot of [UNNAMED, NAMED]) {
    const entries = Object.entries(snapshot);
    for (let offset = 0; offset < entries.length; offset++) {
      const reordered = {
        ...Object.fromEntries([...entries.slice(offset), ...entries.slice(0, offset)]),
        selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
      };
      const restored = decodeSnapshot(JSON.stringify(reordered));
      assert.ok(restored, `version ${snapshot.version}, rotation ${offset}`);
      assert.deepEqual(restored.matched, [0, 11]);
      assert.deepEqual(restored.selection, UNNAMED.selection);
      assert.equal(restored.elapsedMs, 1500);
      assert.deepEqual(JSON.parse(encodeSnapshot(restored)), snapshot);
    }
  }
});

test('named snapshots preserve every allowed character and enforce UTF-16 length', () => {
  for (const name of ['Café', ' ', '  spaced  ', '🃏'.repeat(20), 'a'.repeat(40), '\t"\\\u0000']) {
    const snapshot = { ...NAMED, name };
    const state = decodeSnapshot(JSON.stringify(snapshot));
    assert.ok(state, `valid name ${JSON.stringify(name)}`);
    assert.deepEqual(JSON.parse(encodeSnapshot(state)), snapshot);
  }
  for (const name of ['', null, 1, {}, [], true, 'a'.repeat(41), '🃏'.repeat(21), 'a\rb', 'a\nb'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name })), null);
});

test('each snapshot version requires exactly its own fields, independent of key order', () => {
  for (const snapshot of [UNNAMED, NAMED]) {
    assert.ok(decodeSnapshot(JSON.stringify(snapshot)), 'valid baseline');
    const entries = Object.entries(snapshot).reverse();
    for (const [key] of entries) {
      const missing = Object.fromEntries(entries.filter(([field]) => field !== key));
      assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${key}`);
    }
    for (const extra of ['extra', '__proto__', 'constructor']) {
      const unknown = Object.fromEntries([...entries, [extra, true]]);
      assert.equal(decodeSnapshot(JSON.stringify(unknown)), null, `unknown ${extra}`);
    }
    for (const version of [0, 3, '1', '2', null])
      assert.equal(decodeSnapshot(JSON.stringify({ ...snapshot, version })), null);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, name: 'Café' })), null);
});

test('version 2 retains progress validation and measures the UTF-8 byte limit', () => {
  for (const invalid of [
    { moves: 0 },
    { elapsedMs: 359_999_999 + 1 },
    { matched: [0] },
    { selection: { ...NAMED.selection, extra: true } },
    { selection: { ...NAMED.selection, remainingMs: 0 } },
    { started: false },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, ...invalid })), null);
  const json = JSON.stringify(NAMED);
  const padded = json + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(json, 'utf8'));
  assert.ok(decodeSnapshot(padded), 'exact byte limit');
  assert.equal(decodeSnapshot(padded + ' '), null, 'one byte beyond the limit');
});
