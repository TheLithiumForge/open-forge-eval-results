import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame, isWon } from './game.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_MAX_BYTES,
} from './snapshot.ts';

test('unnamed exports keep the version 1 shape and imports stay unnamed', () => {
  const text = encodeSnapshot(createGame(EXAMPLE_CODE));
  const value: unknown = JSON.parse(text);
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  assert.equal('name' in value, false);
  assert.equal('version' in value && value.version, 1);
  assert.equal(decodeSnapshot(text)?.name, '');
});

test('named progress exports and restores its exact name and game state', () => {
  const initial = { ...createGame(EXAMPLE_CODE), name: '  Café 🧩  ' };
  const playing = advanceGame(activateCard(initial, 0), 25);
  const exported: unknown = JSON.parse(encodeSnapshot(playing));
  assert.ok(exported && typeof exported === 'object' && !Array.isArray(exported));
  assert.equal('version' in exported && exported.version, NAMED_SNAPSHOT_VERSION);
  assert.equal('name' in exported && exported.name, initial.name);
  assert.deepEqual(decodeSnapshot(encodeSnapshot(playing)), playing);
});

test('names survive pending mismatches and completed progress exports', () => {
  const named = { ...createGame(EXAMPLE_CODE), name: 'Saved Café' };
  const mismatch = advanceGame(activateCard(activateCard(named, 0), 1), 12.5);
  const pending = decodeSnapshot(encodeSnapshot(mismatch));
  assert.equal(pending?.name, named.name);
  assert.equal(pending?.elapsedMs, 12);
  assert.equal(pending?.selection.kind === 'mismatch' && pending.selection.remainingMs, 788);

  const won = EXAMPLE_PAIRS.reduce(
    (game, [first, second]) => activateCard(activateCard(game, first), second),
    named,
  );
  const restored = decodeSnapshot(encodeSnapshot(won));
  assert.ok(isWon(won));
  assert.ok(restored && isWon(restored));
  assert.equal(restored.name, named.name);
});

function namedSnapshot(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: NAMED_SNAPSHOT_VERSION,
    boardCode: EXAMPLE_CODE,
    name: 'Café',
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
    ...overrides,
  });
}

test('named imports require a nonempty valid name and exactly the version 2 fields', () => {
  assert.equal(decodeSnapshot(namedSnapshot())?.name, 'Café');
  for (const name of ['', 'a'.repeat(41), 'a\nb', 'a\rb', null, 3])
    assert.equal(decodeSnapshot(namedSnapshot({ name })), null, String(name));
  assert.equal(decodeSnapshot(namedSnapshot({ extra: true })), null);
  assert.equal(decodeSnapshot(namedSnapshot({ version: 3 })), null);
  const missingName = JSON.stringify({
    version: NAMED_SNAPSHOT_VERSION,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
  assert.equal(decodeSnapshot(missingName), null);
});

test('named Unicode snapshots count their 65536 byte limit in UTF-8', () => {
  const text = namedSnapshot({ name: 'Café 🧩' });
  const exact = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.equal(decodeSnapshot(exact)?.name, 'Café 🧩');
  assert.equal(decodeSnapshot(`${exact} `), null);
});

test('version 1 rejects a name field instead of silently accepting it', () => {
  const legacy: unknown = JSON.parse(encodeSnapshot(createGame(EXAMPLE_CODE)));
  assert.ok(legacy && typeof legacy === 'object' && !Array.isArray(legacy));
  assert.equal(decodeSnapshot(JSON.stringify({ ...legacy, name: 'Café' })), null);
});
