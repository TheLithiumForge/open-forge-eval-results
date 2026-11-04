import assert from 'node:assert/strict';
import { test } from 'vitest';
import { cleanDealName, DEAL_NAME_MAX_UNITS, withDealName } from './deal-name.ts';
import { activateCard, createGame } from './game.ts';
import { isJsonObject } from './saved-format.ts';
import { decodeSnapshot, encodeSnapshot, NAMED_SNAPSHOT_VERSION } from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

function record(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isJsonObject(value)) throw new Error('Expected an object.');
  return value;
}

const started = activateCard(createGame(EXAMPLE_CODE), 2);
const NAMED = `{"version":2,"name":"Café","boardCode":"np1-4-1","matched":[],"selection":{"kind":"one","index":2},"moves":0,"elapsedMs":0,"started":true}`;

test('a named game exports version 2 and round trips with its name', () => {
  const named = withDealName(started, ' Café  ');
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  assert.deepEqual(record(encodeSnapshot(named)), { ...record(NAMED), name: ' Café  ' });
  assert.deepEqual(decodeSnapshot(encodeSnapshot(named)), named);
  assert.equal(decodeSnapshot(NAMED)?.name, 'Café');
});

test('an unnamed game exports version 1 without a name field', () => {
  const { name: _name, ...unnamed } = record(NAMED);
  assert.deepEqual(record(encodeSnapshot(started)), { ...unnamed, version: 1 });
  assert.equal(decodeSnapshot(encodeSnapshot(started))?.name, undefined);
  assert.deepEqual(withDealName(withDealName(started, 'x'), ''), started);
  assert.equal(withDealName(started, ''), started);
});

test('pasted snapshots open whatever order their fields come in', () => {
  const fields = Object.entries(record(NAMED));
  for (const ordered of [fields.toReversed(), [...fields.slice(3), ...fields.slice(0, 3)]])
    assert.equal(decodeSnapshot(JSON.stringify(Object.fromEntries(ordered)))?.name, 'Café');
  const unnamed = Object.entries({ ...record(NAMED), version: 1 })
    .filter(([key]) => key !== 'name')
    .toReversed();
  assert.ok(decodeSnapshot(JSON.stringify(Object.fromEntries(unnamed))));
});

test('name rules reject bad names and mismatched versions', () => {
  const base = record(NAMED);
  const { name: _name, ...noName } = base;
  const bad: unknown[] = ['', 'a\nb', 'a\rb', 'x'.repeat(DEAL_NAME_MAX_UNITS + 1), 7, null];
  for (const name of bad)
    assert.equal(decodeSnapshot(JSON.stringify({ ...base, name })), null, String(name));
  assert.ok(decodeSnapshot(JSON.stringify({ ...base, name: 'x'.repeat(DEAL_NAME_MAX_UNITS) })));
  assert.equal(decodeSnapshot(JSON.stringify(noName)), null, 'version 2 needs a name');
  assert.equal(decodeSnapshot(JSON.stringify({ ...base, version: 1 })), null, 'version 1 has none');
  assert.equal(decodeSnapshot(JSON.stringify({ ...base, version: 3 })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...base, extra: 1 })), null);
});

test('typed names drop line breaks and keep spaces', () => {
  assert.equal(cleanDealName(' a\r\nb '), ' ab ');
  assert.equal(cleanDealName('x'.repeat(50)).length, DEAL_NAME_MAX_UNITS);
});
