import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_MAX_BYTES } from './snapshot.ts';

const PROGRESS = {
  boardCode: 'np1-4-1',
  matched: [11, 0],
  selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
  moves: 2,
  elapsedMs: 1500,
  started: true,
};

test('both snapshot versions accept every field position without reconstructing earlier turns', () => {
  for (const header of [{ version: 1 }, { version: 2, name: ' Café 🃏 ' }]) {
    const entries = Object.entries({ ...PROGRESS, ...header });
    for (let offset = 0; offset < entries.length; offset++) {
      const text = JSON.stringify(
        Object.fromEntries([...entries.slice(offset), ...entries.slice(0, offset)]),
      );
      const state = decodeSnapshot(text);
      assert.ok(state, `version ${header.version}, field offset ${offset}`);
      assert.deepEqual(state.matched, PROGRESS.matched);
      assert.equal(state.moves, PROGRESS.moves);
      assert.equal(state.elapsedMs, PROGRESS.elapsedMs);
      assert.deepEqual(state.selection, PROGRESS.selection);
    }
  }
});

test('named progress preserves names exactly and clearing a name returns to version one', () => {
  for (const name of ['Café', '  ', '  Café 🃏  ', '<script>&"', 'x'.repeat(40), '🃏'.repeat(20)]) {
    const state = decodeSnapshot(JSON.stringify({ ...PROGRESS, version: 2, name }));
    assert.ok(state);
    assert.equal(state.name, name);
    assert.deepEqual(JSON.parse(encodeSnapshot(state)), {
      ...PROGRESS,
      matched: [0, 11],
      version: 2,
      name,
    });
    const unnamed = JSON.parse(encodeSnapshot({ ...state, name: '' }));
    assert.equal(unnamed.version, 1);
    assert.equal(Object.hasOwn(unnamed, 'name'), false);
  }
});

test('both formats reject missing or unknown keys and invalid versions or names', () => {
  for (const valid of [
    { ...PROGRESS, version: 1 },
    { ...PROGRESS, version: 2, name: 'Café' },
  ]) {
    assert.ok(decodeSnapshot(JSON.stringify(valid)));
    for (const key of Object.keys(valid)) {
      const missing = Object.fromEntries(Object.entries(valid).filter(([field]) => field !== key));
      assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${key}`);
    }
    assert.equal(decodeSnapshot(JSON.stringify({ ...valid, extra: true })), null);
    assert.equal(decodeSnapshot(JSON.stringify({ ...valid, version: 3 })), null);
  }
  for (const name of ['', null, 1, false, [], {}, 'x'.repeat(41), '🃏'.repeat(21), 'a\rb', 'a\nb'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...PROGRESS, version: 2, name })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...PROGRESS, version: 1, name: 'Café' })), null);
});

test('named snapshots still enforce state rules and UTF-8 byte limits', () => {
  const valid = { ...PROGRESS, version: 2, name: 'Café 🃏' };
  for (const changes of [
    { matched: [0] },
    { moves: 1 },
    { started: false },
    { elapsedMs: 359_999_999 + 1 },
    { selection: { ...PROGRESS.selection, remainingMs: 0 } },
    { selection: { ...PROGRESS.selection, extra: true } },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...valid, ...changes })), null);
  const text = JSON.stringify(valid);
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});
