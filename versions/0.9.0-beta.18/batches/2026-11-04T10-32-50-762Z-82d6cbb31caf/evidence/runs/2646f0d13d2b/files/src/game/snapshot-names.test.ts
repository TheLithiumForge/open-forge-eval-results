import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import type { GameState } from './game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_MAX_BYTES } from './snapshot.ts';

const NAMED = {
  version: 2,
  name: 'Café',
  boardCode: 'np1-4-1',
  matched: [],
  selection: { kind: 'one', index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};

test('named snapshots restore literal progress and preserve every permitted name character', () => {
  const restored = decodeSnapshot(JSON.stringify(NAMED));
  assert.ok(restored);
  assert.equal(restored.name, 'Café');
  assert.deepEqual(restored.selection, { kind: 'one', index: 2 });
  for (const name of [
    '  Café  ',
    ' ',
    '\t',
    '"\\<>\u0000',
    'e\u0301',
    '😀'.repeat(20),
    'a'.repeat(40),
  ]) {
    const game: GameState = { ...restored, name };
    assert.deepEqual(decodeSnapshot(encodeSnapshot(game)), game);
    const exported: unknown = JSON.parse(encodeSnapshot(game));
    assert.deepEqual(exported, { ...NAMED, name });
  }
});

test('names must be nonempty valid strings in version two and absent in version one', () => {
  for (const name of [
    undefined,
    null,
    42,
    false,
    [],
    {},
    '',
    'a'.repeat(41),
    '😀'.repeat(20) + 'a',
    'line\rbreak',
    'line\nbreak',
    'line\r\nbreak',
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version: 1 })), null);
  const game = createGame('np1-4-1');
  assert.equal(game.name, '');
  assert.equal(decodeSnapshot(encodeSnapshot(game))?.name, '');
  const exported: unknown = JSON.parse(encodeSnapshot({ ...game, name: '' }));
  assert.deepEqual(exported, {
    version: 1,
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
});

test('named progress keeps its name through turns, active time and snapshot rounding', () => {
  const start = { ...createGame('np1-4-1'), name: '  My game 😀  ' };
  const mismatch = advanceGame(activateCard(activateCard(start, 0), 1), 799.75);
  const restored = decodeSnapshot(encodeSnapshot(mismatch));
  assert.equal(restored?.name, start.name);
  assert.equal(restored?.elapsedMs, 799);
  assert.deepEqual(restored?.selection, {
    kind: 'mismatch',
    first: 0,
    second: 1,
    remainingMs: 1,
  });
  const matched = activateCard(activateCard(advanceGame(mismatch, 1), 2), 6);
  assert.equal(matched.name, start.name);
});

test('named snapshots count multibyte names toward the exact UTF-8 byte limit', () => {
  const text = JSON.stringify({ ...NAMED, name: '😀'.repeat(20) });
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});
