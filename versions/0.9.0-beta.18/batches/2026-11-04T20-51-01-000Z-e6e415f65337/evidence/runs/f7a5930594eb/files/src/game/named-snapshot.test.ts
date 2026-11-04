import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from './game.ts';
import { DEAL_NAME_MAX_UNITS } from './deal-name.ts';
import { decodeSnapshot, encodeSnapshot, NAMED_SNAPSHOT_VERSION } from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

const STARTED = activateCard(createGame(EXAMPLE_CODE), 2);

function named(name: unknown): string {
  return JSON.stringify({
    version: NAMED_SNAPSHOT_VERSION,
    name,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'one', index: 2 },
    moves: 0,
    elapsedMs: 0,
    started: true,
  });
}

test('a named game exports version 2 and an unnamed game exports version 1', () => {
  const exported: unknown = JSON.parse(encodeSnapshot({ ...STARTED, name: 'Café' }));
  assert.deepEqual(exported && typeof exported === 'object' && 'version' in exported && exported, {
    version: 2,
    name: 'Café',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'one', index: 2 },
    moves: 0,
    elapsedMs: 0,
    started: true,
  });
  assert.equal(JSON.parse(encodeSnapshot(STARTED)).version, 1);
  assert.ok(!('name' in JSON.parse(encodeSnapshot(STARTED))));
});

test('a named snapshot restores its name and keeps surrounding spaces', () => {
  for (const name of ['Café', '  padded  ', ' ', 'x'.repeat(DEAL_NAME_MAX_UNITS)]) {
    const state = decodeSnapshot(named(name));
    assert.equal(state?.name, name);
    assert.deepEqual(decodeSnapshot(encodeSnapshot({ ...STARTED, name })), { ...STARTED, name });
  }
});

test('a version 1 snapshot restores an unnamed game', () => {
  assert.equal(decodeSnapshot(encodeSnapshot(STARTED))?.name, '');
});

test('version 2 needs a valid nonempty name', () => {
  for (const name of ['', 'x'.repeat(DEAL_NAME_MAX_UNITS + 1), 'a\nb', 'a\rb', 7, null, undefined])
    assert.equal(decodeSnapshot(named(name)), null, String(name));
  const missing = JSON.parse(named('x'));
  delete missing.name;
  assert.equal(decodeSnapshot(JSON.stringify(missing)), null);
  assert.equal(decodeSnapshot(named('x').replace('"version":2', '"version":3')), null);
  assert.equal(decodeSnapshot(named('x').replace('"version":2', '"version":1')), null);
});

test('pasted snapshots load whatever order their keys have', () => {
  const fields = Object.entries(JSON.parse(named('Café')));
  for (const order of [fields, [...fields].reverse(), [...fields.slice(3), ...fields.slice(0, 3)]])
    assert.equal(decodeSnapshot(JSON.stringify(Object.fromEntries(order)))?.name, 'Café');
  const unnamed = Object.entries(JSON.parse(encodeSnapshot(STARTED)));
  assert.deepEqual(
    decodeSnapshot(JSON.stringify(Object.fromEntries([...unnamed].reverse()))),
    STARTED,
  );
  assert.equal(decodeSnapshot(JSON.stringify({ ...Object.fromEntries(unnamed), extra: 1 })), null);
});
