import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { GAME_NAME_MAX_CHARACTERS } from './game-name.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  readSnapshot,
  SNAPSHOT_KEYS,
  SNAPSHOT_NAME_KEY,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

const PENDING = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 175);
const FIELDS = {
  version: SNAPSHOT_VERSION,
  boardCode: EXAMPLE_CODE,
  matched: [2, 6],
  selection: { kind: SelectionKind.one, index: 0 },
  moves: 1,
  elapsedMs: 1200,
  started: true,
};

function reordered(keys: readonly string[], extra: Record<string, unknown> = {}): string {
  const source: Record<string, unknown> = { ...FIELDS, ...extra };
  return JSON.stringify(Object.fromEntries(keys.map((key) => [key, source[key]])), null, 2);
}

test('a named save brings back its name with the same game', () => {
  const text = encodeSnapshot(PENDING, 'Lunch break');
  assert.deepEqual(readSnapshot(text), { game: PENDING, name: 'Lunch break' });
  assert.deepEqual(decodeSnapshot(text), PENDING);
  const exported: unknown = JSON.parse(text);
  assert.ok(exported && typeof exported === 'object');
  assert.deepEqual(Object.keys(exported).sort(), [...SNAPSHOT_KEYS, SNAPSHOT_NAME_KEY].sort());
});

test('an unnamed save keeps the original fields and loads with an empty name', () => {
  for (const name of ['', '   ']) {
    const text = encodeSnapshot(PENDING, name);
    assert.equal(text, encodeSnapshot(PENDING));
    assert.doesNotMatch(text, new RegExp(`"${SNAPSHOT_NAME_KEY}"`));
    assert.deepEqual(readSnapshot(text), { game: PENDING, name: '' });
  }
});

test('pasted saves load whatever order their fields arrive in', () => {
  const keys = Object.keys(FIELDS);
  const expected = readSnapshot(JSON.stringify(FIELDS));
  assert.ok(expected);
  for (const order of [[...keys].reverse(), [...keys].sort(), [...keys.slice(1), keys[0] ?? '']])
    assert.deepEqual(readSnapshot(reordered(order)), expected, order.join());
  const named = reordered([...keys.slice(0, 3), SNAPSHOT_NAME_KEY, ...keys.slice(3)], {
    [SNAPSHOT_NAME_KEY]: 'Pasted',
  });
  assert.deepEqual(readSnapshot(named), { ...expected, name: 'Pasted' });
});

test('saved names drop surrounding spaces and an empty name means unnamed', () => {
  const save = (name: unknown) => JSON.stringify({ ...FIELDS, [SNAPSHOT_NAME_KEY]: name });
  assert.equal(readSnapshot(save('  Sunday  '))?.name, 'Sunday');
  assert.equal(readSnapshot(save(''))?.name, '');
  const longest = 'x'.repeat(GAME_NAME_MAX_CHARACTERS);
  assert.equal(readSnapshot(save(longest))?.name, longest);
  assert.equal(readSnapshot(save(` ${longest} `))?.name, longest);
});

test('saves with a name that is not short plain text are rejected', () => {
  const tooLong = 'x'.repeat(GAME_NAME_MAX_CHARACTERS + 1);
  for (const name of [null, 7, true, ['a'], { text: 'a' }, tooLong, 'line\nbreak', 'tab\there'])
    assert.equal(
      readSnapshot(JSON.stringify({ ...FIELDS, [SNAPSHOT_NAME_KEY]: name })),
      null,
      String(name),
    );
});

test('a reordered save still needs every field once and nothing else', () => {
  const keys = [...Object.keys(FIELDS)].reverse();
  assert.equal(readSnapshot(reordered(keys.slice(1))), null);
  assert.equal(readSnapshot(reordered([...keys, 'extra'], { extra: 1 })), null);
  assert.equal(readSnapshot(reordered(keys, { version: SNAPSHOT_VERSION + 1 })), null);
});
