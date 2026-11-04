import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renameGame } from './deal-name.ts';
import { activateCard, advanceGame, createGame, isWon, MOVES_MAX, ELAPSED_MAX_MS } from './game.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_NAMED_VERSION,
} from './snapshot.ts';
import { replayGame } from './replay.ts';

function namedSnapshot(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 2,
    name: 'Café',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
    ...overrides,
  };
}

test('named snapshots round trip without altering Unicode or surrounding spaces', () => {
  assert.equal(SNAPSHOT_NAMED_VERSION, 2);
  const progress = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 175);
  for (const name of ['  Café\t🎴  ', ' ', '\u2028', 'x'.repeat(40), '🎴'.repeat(20)]) {
    const state = renameGame(progress, name);
    const expected = {
      version: 2,
      name,
      boardCode: EXAMPLE_CODE,
      matched: [],
      selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 625 },
      moves: 1,
      elapsedMs: 175,
      started: true,
    };
    assert.deepEqual(JSON.parse(encodeSnapshot(state)), expected);
    assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
  }
});

test('unnamed progress and replay output keep the version one schema without a name field', () => {
  const unnamed = renameGame(renameGame(createGame(EXAMPLE_CODE), 'Draft'), '');
  assert.deepEqual(JSON.parse(encodeSnapshot(unnamed)), {
    version: 1,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
  assert.equal(decodeSnapshot(encodeSnapshot(unnamed))?.name, '');
  const replayed = replayGame('{"version":1,"boardCode":"np1-4-1","actions":[],"endMs":0}');
  assert.ok(replayed);
  assert.equal(replayed.name, '');
  assert.equal(encodeSnapshot(replayed), encodeSnapshot(unnamed));
});

test('named snapshots require a valid nonempty name and exactly their versioned fields', () => {
  for (const name of ['', null, 1, false, {}, [], 'x'.repeat(41), '🎴'.repeat(21), 'a\rb', 'a\nb'])
    assert.equal(decodeSnapshot(JSON.stringify(namedSnapshot({ name }))), null);
  for (const version of [0, 1, 3, '2', null])
    assert.equal(decodeSnapshot(JSON.stringify(namedSnapshot({ version }))), null);
  assert.equal(decodeSnapshot(JSON.stringify(namedSnapshot({ extra: true }))), null);
  for (const field of Object.keys(namedSnapshot())) {
    const missing = namedSnapshot();
    delete missing[field];
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${field}`);
  }
});

test('named snapshots keep byte, progress and counter validation', () => {
  const invalid = [
    { moves: MOVES_MAX + 1 },
    { elapsedMs: ELAPSED_MAX_MS + 1 },
    { moves: 0.5 },
    { started: true },
    { matched: [0, 1], started: true, moves: 1 },
    { selection: { kind: 'closed', extra: true } },
  ];
  for (const overrides of invalid)
    assert.equal(decodeSnapshot(JSON.stringify(namedSnapshot(overrides))), null);
  const text = JSON.stringify(namedSnapshot({ name: 'é'.repeat(40) }));
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});

test('completed named snapshots retain completion and pending exports use whole milliseconds', () => {
  const complete = namedSnapshot({
    matched: EXAMPLE_PAIRS.flat(),
    moves: 8,
    elapsedMs: 1234,
    started: true,
  });
  const loaded = decodeSnapshot(JSON.stringify(complete));
  assert.ok(loaded);
  assert.equal(isWon(loaded), true);
  assert.equal(loaded.name, 'Café');
  assert.equal(advanceGame(loaded, 500), loaded);
  const progress = renameGame(
    advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 799.75),
    'Near closing',
  );
  const restored = decodeSnapshot(encodeSnapshot(progress));
  assert.equal(restored?.elapsedMs, 799);
  assert.deepEqual(restored?.selection, {
    kind: 'mismatch',
    first: 0,
    second: 1,
    remainingMs: 1,
  });
});
