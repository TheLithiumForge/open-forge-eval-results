import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_MAX_BYTES } from './snapshot.ts';
import { renameGame } from './deal-name.ts';
import { createGame } from './game.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

const NAMED = {
  version: 2,
  name: 'Café',
  boardCode: 'np1-4-1',
  matched: [],
  selection: { kind: 'one', index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};

test('the named specification example restores its name and exact declared progress', () => {
  const restored = decodeSnapshot(JSON.stringify(NAMED));
  assert.ok(restored);
  assert.equal(restored.name, 'Café');
  assert.equal(restored.boardCode, 'np1-4-1');
  assert.deepEqual(restored.matched, []);
  assert.deepEqual(restored.selection, { kind: 'one', index: 2 });
  assert.equal(restored.started, true);
  assert.equal(restored.moves, 0);
  assert.equal(restored.elapsedMs, 0);
  assert.deepEqual(JSON.parse(encodeSnapshot(restored)), NAMED);
});

test('named exports use version two and clearing a name restores the version one schema', () => {
  const initial = createGame(EXAMPLE_CODE);
  const named = renameGame(initial, '  Café 🎴  ');
  assert.deepEqual(decodeSnapshot(encodeSnapshot(named)), named);
  assert.deepEqual(JSON.parse(encodeSnapshot(named)), {
    version: 2,
    name: '  Café 🎴  ',
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
  assert.deepEqual(encodeSnapshot(renameGame(named, '')), encodeSnapshot(initial));
});

test('named imports keep spaces and use the UTF-16 name limit', () => {
  for (const name of [' ', '  Café 🎴  ', 'é'.repeat(40), '🎴'.repeat(20), '\t\u2028\u2029'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name }))?.name, name);
  for (const name of ['', 'é'.repeat(41), '🎴'.repeat(21), 'a\rb', 'a\nb', null, 1, []])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name })), null);
});

test('snapshot versions require their exact own fields and a valid supported version', () => {
  const unnamed = Object.fromEntries(Object.entries(NAMED).filter(([key]) => key !== 'name'));
  assert.equal(decodeSnapshot(JSON.stringify(unnamed)), null, 'version two needs a name');
  assert.equal(decodeSnapshot(JSON.stringify({ ...unnamed, version: 1 }))?.name, '');
  for (const version of [0, 3, '2', null, true])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version: 1 })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, extra: true })), null);
  for (const key of Object.keys(NAMED)) {
    const fields = Object.fromEntries(Object.entries(NAMED).filter(([field]) => field !== key));
    assert.equal(decodeSnapshot(JSON.stringify(fields)), null, `missing ${key}`);
  }
});

test('named imports preserve the UTF-8 byte boundary and all progress validation', () => {
  const text = JSON.stringify({ ...NAMED, name: 'é'.repeat(40) });
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
  for (const fields of [
    { matched: [0] },
    { moves: 1_000_000 },
    { elapsedMs: 360_000_000 },
    { started: false },
    { selection: { kind: 'one', index: 16 } },
    { selection: { kind: 'one', index: 2, extra: true } },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, ...fields })), null);
});
