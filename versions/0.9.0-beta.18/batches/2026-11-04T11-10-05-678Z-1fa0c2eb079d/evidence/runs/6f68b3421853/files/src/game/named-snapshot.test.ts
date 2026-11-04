import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame, activateCard, advanceGame, isWon } from './game.ts';
import { renameGame } from './deal-name.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_KEYS,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';
import { isJsonObject } from './saved-format.ts';

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

test('named and unnamed progress round trip using their exact versioned fields', () => {
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  const start = createGame(EXAMPLE_CODE);
  const one = activateCard(start, 0);
  const mismatch = advanceGame(activateCard(one, 1), 175);
  let completed = start;
  for (const pair of EXAMPLE_PAIRS)
    for (const index of pair) completed = activateCard(completed, index);
  assert.equal(isWon(completed), true);
  for (const progress of [start, one, mismatch, completed])
    for (const name of ['Café', '  Café  ', ' ', '😀'.repeat(20)]) {
      const named = renameGame(progress, name);
      const text = encodeSnapshot(named);
      const exported: unknown = JSON.parse(text);
      assert.ok(isJsonObject(exported));
      assert.deepEqual(Object.keys(exported).sort(), [...SNAPSHOT_KEYS, 'name'].sort());
      assert.equal(exported.version, NAMED_SNAPSHOT_VERSION);
      assert.deepEqual(decodeSnapshot(text), {
        ...named,
        matched: [...named.matched].sort((left, right) => left - right),
      });
      const unnamed = renameGame(named, '');
      const legacy: unknown = JSON.parse(encodeSnapshot(unnamed));
      assert.ok(isJsonObject(legacy));
      assert.deepEqual(Object.keys(legacy).sort(), [...SNAPSHOT_KEYS].sort());
      assert.equal(legacy.version, SNAPSHOT_VERSION);
      assert.equal(decodeSnapshot(encodeSnapshot(unnamed))?.name, '');
    }
});

test('named imports accept reordered fields and keep the specification example progress', () => {
  const expected = { ...activateCard(createGame(EXAMPLE_CODE), 2), name: 'Café' };
  const fields = Object.entries(NAMED);
  for (let offset = 0; offset < fields.length; offset++) {
    const rotated = [...fields.slice(offset), ...fields.slice(0, offset)];
    for (const entries of [rotated, [...rotated].reverse()])
      assert.deepEqual(decodeSnapshot(JSON.stringify(Object.fromEntries(entries))), expected);
  }
});

test('named imports reject invalid names, unsupported versions and inconsistent progress', () => {
  for (const overrides of [
    ...['', 'x'.repeat(41), '😀'.repeat(21), 'a\rb', 'a\nb', '\r\n', null, 1, [], {}].map(
      (name) => ({ name }),
    ),
    ...[SNAPSHOT_VERSION, 0, 3, '2', null].map((version) => ({ version })),
    { extra: true },
    { moves: -1 },
    { elapsedMs: 359_999_999 + 1 },
    { started: false },
    { matched: [2] },
    { selection: { kind: SelectionKind.one, index: 16 } },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, ...overrides })), null);
  const fields = Object.entries(NAMED);
  for (const [missing] of fields)
    assert.equal(
      decodeSnapshot(JSON.stringify(Object.fromEntries(fields.filter(([key]) => key !== missing)))),
      null,
    );
});

test('named snapshot limits count UTF-8 bytes including the name', () => {
  const text = JSON.stringify({ ...NAMED, name: '😀'.repeat(20) });
  const padding = ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.ok(decodeSnapshot(text + padding));
  assert.equal(decodeSnapshot(text + padding + ' '), null);
});
