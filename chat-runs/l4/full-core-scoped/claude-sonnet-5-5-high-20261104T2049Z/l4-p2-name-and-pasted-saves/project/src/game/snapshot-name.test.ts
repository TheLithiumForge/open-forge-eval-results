import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from './game.ts';
import { DEAL_NAME_MAX_LENGTH } from './deal-name.ts';
import { decodeSnapshot, encodeSnapshot, NAMED_SNAPSHOT_VERSION } from './snapshot.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

const NAMED = {
  version: NAMED_SNAPSHOT_VERSION,
  name: 'Café',
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: SelectionKind.one, index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};

function named(name: string) {
  return { ...createGame(EXAMPLE_CODE), name };
}

test('a named snapshot round trips as version 2 and an unnamed one stays version 1', () => {
  const state = { ...activateCard(createGame(EXAMPLE_CODE), 2), name: ' Café  ' };
  const exported: unknown = JSON.parse(encodeSnapshot(state));
  assert.deepEqual(exported, { ...NAMED, name: ' Café  ' });
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
  const unnamed: unknown = JSON.parse(encodeSnapshot(createGame(EXAMPLE_CODE)));
  assert.ok(unnamed && typeof unnamed === 'object' && !('name' in unnamed));
  assert.equal(Reflect.get(unnamed, 'version'), 1);
});

test('the documented named example restores its name and revealed card', () => {
  const restored = decodeSnapshot(JSON.stringify(NAMED));
  assert.equal(restored?.name, 'Café');
  assert.deepEqual(restored?.selection, NAMED.selection);
});

test('a version 1 snapshot restores unnamed', () => {
  const { name: _name, ...rest } = NAMED;
  assert.equal(decodeSnapshot(JSON.stringify({ ...rest, version: 1 }))?.name, '');
});

test('saved snapshots open whatever order their fields are written in', () => {
  const fields = Object.entries({ ...NAMED, selection: { index: 2, kind: 'one' } });
  const expected = decodeSnapshot(JSON.stringify(NAMED));
  assert.ok(expected);
  for (const order of [fields.toReversed(), [...fields.slice(3), ...fields.slice(0, 3)]])
    assert.deepEqual(decodeSnapshot(JSON.stringify(Object.fromEntries(order))), expected);
  const plain = createGame(EXAMPLE_CODE);
  const reversed = Object.entries(JSON.parse(encodeSnapshot(plain))).toReversed();
  assert.deepEqual(decodeSnapshot(JSON.stringify(Object.fromEntries(reversed))), plain);
});

test('version 2 needs a valid nonempty name and version 1 allows none', () => {
  const rejected: unknown[] = [
    '',
    'x'.repeat(DEAL_NAME_MAX_LENGTH + 1),
    'two\nlines',
    'two\rlines',
    7,
    null,
  ];
  for (const name of rejected)
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name })), null, String(name));
  const { name: _name, ...missing } = NAMED;
  assert.equal(decodeSnapshot(JSON.stringify(missing)), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version: 1 })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version: 3 })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, extra: true })), null);
});

test('a name may use the full 40 code units and keeps its spaces', () => {
  const longest = ` ${'a'.repeat(DEAL_NAME_MAX_LENGTH - 2)} `;
  assert.equal(decodeSnapshot(encodeSnapshot(named(longest)))?.name, longest);
});
