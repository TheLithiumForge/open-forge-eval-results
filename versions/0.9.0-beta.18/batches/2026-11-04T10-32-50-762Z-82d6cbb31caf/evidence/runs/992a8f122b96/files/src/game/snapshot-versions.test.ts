import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { renameGame } from './deal-name.ts';
import { decodeSnapshot, encodeSnapshot, NAMED_SNAPSHOT_VERSION } from './snapshot.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';
import { isJsonObject } from './saved-format.ts';

const UNNAMED = {
  version: 1,
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: 'closed' },
  moves: 0,
  elapsedMs: 0,
  started: false,
};

test('named snapshots restore exact names and progress in each turn state and at completion', () => {
  const initial = createGame(EXAMPLE_CODE);
  const one = activateCard(initial, 0);
  const pending = advanceGame(activateCard(one, 1), 175);
  let completed = initial;
  for (const pair of EXAMPLE_PAIRS)
    for (const index of pair) completed = activateCard(completed, index);
  for (const progress of [initial, one, pending, completed]) {
    const restored = {
      ...progress,
      matched: [...progress.matched].sort((left, right) => left - right),
    };
    for (const name of ['  Café 🃏  ', ' ', 'x'.repeat(40), '🃏'.repeat(20)]) {
      const named = renameGame(progress, name);
      const text = encodeSnapshot(named);
      const value: unknown = JSON.parse(text);
      assert.ok(isJsonObject(value));
      assert.equal(NAMED_SNAPSHOT_VERSION, 2);
      assert.deepEqual(Object.keys(value).sort(), [...Object.keys(UNNAMED), 'name'].sort());
      assert.equal(value.version, 2);
      assert.equal(value.name, name);
      assert.deepEqual(decodeSnapshot(text), { ...restored, name });
    }
    assert.deepEqual(decodeSnapshot(encodeSnapshot(renameGame(progress, ''))), restored);
    const unnamed: unknown = JSON.parse(encodeSnapshot(progress));
    assert.ok(isJsonObject(unnamed));
    assert.equal(unnamed.version, 1);
    assert.equal(Object.hasOwn(unnamed, 'name'), false);
  }
});

test('snapshot versions require their exact fields and valid nonempty names', () => {
  const named = { ...UNNAMED, version: 2, name: 'Café' };
  assert.ok(decodeSnapshot(JSON.stringify(named)));
  for (const name of ['', 1, null, [], {}, 'x'.repeat(41), '🃏'.repeat(21), 'a\rb', 'a\nb'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...named, name })), null);
  for (const version of [0, 3, '1', '2', null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, version })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, version: 2 })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, name: 'Café' })), null);
  for (const valid of [UNNAMED, named]) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...valid, extra: true })), null);
    for (const key of Object.keys(valid)) {
      const missing = Object.fromEntries(Object.entries(valid).filter(([field]) => field !== key));
      assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${key}`);
    }
    assert.equal(decodeSnapshot(JSON.stringify({ ...valid, matched: [0] })), null);
    assert.equal(
      decodeSnapshot(JSON.stringify({ ...valid, selection: { kind: 'closed', extra: 1 } })),
      null,
    );
    assert.equal(decodeSnapshot(JSON.stringify({ ...valid, elapsedMs: 359_999_999 + 1 })), null);
    assert.equal(decodeSnapshot(JSON.stringify({ ...valid, moves: 999_999 + 1 })), null);
  }
});

test('named snapshot limits count UTF-8 bytes including multibyte names', () => {
  const text = JSON.stringify({ ...UNNAMED, version: 2, name: 'Café 🃏' });
  const limit = 65_536;
  const padded = text + ' '.repeat(limit - Buffer.byteLength(text, 'utf8'));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});
