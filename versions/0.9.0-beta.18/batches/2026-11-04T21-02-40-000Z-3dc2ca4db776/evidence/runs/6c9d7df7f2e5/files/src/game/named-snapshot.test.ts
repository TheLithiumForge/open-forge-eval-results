import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { DEAL_NAME_MAX_UNITS, isDealName, UNNAMED } from './deal-name.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_KEYS,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_KEYS,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE, SPEC_VECTOR } from './game.fixture.ts';

const PROGRESS = {
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: SelectionKind.one, index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};
const CAFE = 'Café';
// One astral character takes two UTF-16 code units.
const ASTRAL = '\u{1F0CF}';

function named(name: unknown, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ version: NAMED_SNAPSHOT_VERSION, name, ...PROGRESS, ...overrides });
}

test('the documented named snapshot restores its name and one revealed card', () => {
  const text = `{"version":2,"name":"Café","boardCode":"np1-4-1","matched":[],"selection":{"kind":"one","index":2},"moves":0,"elapsedMs":0,"started":true}`;
  const state = decodeSnapshot(text);
  assert.ok(state);
  assert.equal(state.name, CAFE);
  assert.deepEqual(state.selection, { kind: SelectionKind.one, index: 2 });
  assert.equal(NAMED_SNAPSHOT_VERSION, SPEC_VECTOR.namedSnapshotVersion);
  assert.equal(DEAL_NAME_MAX_UNITS, SPEC_VECTOR.dealNameUnits);
});

test('named progress exports version 2 with a name and unnamed progress keeps version 1', () => {
  const state = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 175);
  const unnamed: unknown = JSON.parse(encodeSnapshot(state));
  assert.ok(unnamed && typeof unnamed === 'object' && 'version' in unnamed);
  assert.equal(unnamed.version, SNAPSHOT_VERSION);
  assert.deepEqual(Object.keys(unnamed).sort(), [...SNAPSHOT_KEYS].sort());
  const withName = { ...state, name: ` ${CAFE} ` };
  const exported: unknown = JSON.parse(encodeSnapshot(withName));
  assert.ok(exported && typeof exported === 'object' && 'name' in exported);
  assert.deepEqual(Object.keys(exported).sort(), [...NAMED_SNAPSHOT_KEYS].sort());
  assert.equal(exported.name, ` ${CAFE} `, 'surrounding spaces stay');
  assert.deepEqual(decodeSnapshot(encodeSnapshot(withName)), withName);
  assert.equal(decodeSnapshot(encodeSnapshot(state))?.name, UNNAMED);
});

test('names allow 40 UTF-16 code units on one line and reject anything else', () => {
  const longest = 'a'.repeat(DEAL_NAME_MAX_UNITS - 2) + ASTRAL;
  for (const name of [longest, ' ', 'tab\there', ' '])
    assert.equal(decodeSnapshot(named(name))?.name, name, JSON.stringify(name));
  for (const name of ['', `${longest}a`, 'line\nbreak', 'carriage\rreturn', 7, null, ['a']]) {
    assert.equal(decodeSnapshot(named(name)), null, JSON.stringify(name));
    assert.equal(isDealName(name), false, JSON.stringify(name));
  }
});

test('each version accepts only its own fields and other versions are rejected', () => {
  const unnamed = { version: SNAPSHOT_VERSION, ...PROGRESS };
  assert.ok(decodeSnapshot(JSON.stringify(unnamed)));
  assert.equal(decodeSnapshot(JSON.stringify({ ...unnamed, name: CAFE })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...PROGRESS, version: 2 })), null);
  for (const version of [0, 3, '2', 2.5])
    assert.equal(decodeSnapshot(named(CAFE, { version })), null, String(version));
  assert.equal(decodeSnapshot(named(CAFE, { extra: true })), null);
  assert.equal(decodeSnapshot(named(CAFE, { moves: -1 })), null, 'named progress keeps its rules');
});

test('pasted snapshots load whatever order their fields are written in', () => {
  const reorder = (text: string, order: (keys: string[]) => string[]) => {
    const value: unknown = JSON.parse(text);
    assert.ok(value && typeof value === 'object');
    const entries = new Map(Object.entries(value));
    return JSON.stringify(
      Object.fromEntries(order([...entries.keys()]).map((key) => [key, entries.get(key)])),
    );
  };
  const state = activateCard(createGame(EXAMPLE_CODE), 3);
  for (const text of [encodeSnapshot(state), encodeSnapshot({ ...state, name: CAFE })])
    for (const order of [(keys: string[]) => keys.sort(), (keys: string[]) => keys.reverse()]) {
      const pasted = reorder(text, order);
      assert.notEqual(pasted.indexOf('"version"'), 1, 'version is not the first field');
      assert.deepEqual(decodeSnapshot(pasted), decodeSnapshot(text));
    }
});
