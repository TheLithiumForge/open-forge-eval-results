import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { DEAL_NAME_MAX_LENGTH, isDealName } from './deal-name.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_KEYS,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
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

function reordered(value: Record<string, unknown>, order: (keys: string[]) => string[]): string {
  return JSON.stringify(
    Object.fromEntries(order(Object.keys(value)).map((key) => [key, value[key]])),
  );
}

test('a named game exports version 2 with its name and restores it on import', () => {
  const state = {
    ...advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 175),
    name: ' Café ',
  };
  const exported: unknown = JSON.parse(encodeSnapshot(state));
  assert.ok(exported && typeof exported === 'object');
  assert.deepEqual(Object.keys(exported).sort(), [...SNAPSHOT_KEYS, 'name'].sort());
  assert.deepEqual(exported, {
    ...JSON.parse(encodeSnapshot({ ...state, name: '' })),
    version: 2,
    name: ' Café ',
  });
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
  assert.equal(decodeSnapshot(JSON.stringify(NAMED))?.name, 'Café');
});

test('an unnamed game exports version 1 without a name field and imports unnamed', () => {
  const state = activateCard(createGame(EXAMPLE_CODE), 3);
  const exported: unknown = JSON.parse(encodeSnapshot(state));
  assert.ok(exported && typeof exported === 'object');
  assert.deepEqual(Object.keys(exported).sort(), [...SNAPSHOT_KEYS].sort());
  assert.equal(decodeSnapshot(encodeSnapshot(state))?.name, '');
});

test('pasted snapshots load whatever order their fields use', () => {
  const { name: _name, ...rest } = NAMED;
  const unnamed = { ...rest, version: SNAPSHOT_VERSION };
  for (const value of [NAMED, unnamed])
    for (const order of [
      (keys: string[]) => [...keys].sort(),
      (keys: string[]) => [...keys].reverse(),
      (keys: string[]) => [...keys.slice(1), keys[0] ?? ''],
    ]) {
      const decoded = decodeSnapshot(reordered(value, order));
      assert.ok(decoded, `D05 field order ${reordered(value, order)}`);
      assert.deepEqual(decoded, decodeSnapshot(JSON.stringify(value)));
    }
  const sorted: unknown = JSON.parse(reordered(NAMED, (keys) => [...keys].sort()));
  const pretty = JSON.stringify(sorted, null, '\t').replaceAll('\n', '\r\n');
  assert.equal(decodeSnapshot(`\r\n  ${pretty}\r\n`)?.name, 'Café', 'D10 whitespace is JSON');
});

test('names keep every character except line breaks up to 40 UTF-16 code units', () => {
  const longest = '😀'.repeat(DEAL_NAME_MAX_LENGTH / 2);
  for (const name of [' ', '  spaced  ', 'Tab\there', longest, 'x'.repeat(DEAL_NAME_MAX_LENGTH)]) {
    assert.ok(isDealName(name), `C15 accepts ${JSON.stringify(name)}`);
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name }))?.name, name);
  }
  for (const name of [
    '',
    'a\nb',
    'a\rb',
    'x'.repeat(DEAL_NAME_MAX_LENGTH + 1),
    `${longest}😀`,
    7,
    null,
  ])
    assert.equal(
      decodeSnapshot(JSON.stringify({ ...NAMED, name })),
      null,
      `C15 rejects ${JSON.stringify(name)}`,
    );
});

test('a name must match its version and other versions are rejected', () => {
  const { name: _name, ...withoutName } = NAMED;
  for (const value of [
    withoutName,
    { ...NAMED, version: SNAPSHOT_VERSION },
    { ...NAMED, version: 3 },
    { ...withoutName, version: 3 },
    { ...NAMED, version: '2' },
    { ...NAMED, extra: true },
  ])
    assert.equal(
      decodeSnapshot(JSON.stringify(value)),
      null,
      `D05 rejects ${JSON.stringify(value)}`,
    );
});
