import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_NAMED_VERSION } from './snapshot.ts';

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

test('named progress uses version two and restores the documented example exactly', () => {
  assert.equal(SNAPSHOT_NAMED_VERSION, 2);
  const state = decodeSnapshot(JSON.stringify(NAMED));
  assert.ok(state);
  assert.equal(state.name, 'Café');
  assert.deepEqual(state.selection, { kind: 'one', index: 2 });
  const exported: unknown = JSON.parse(encodeSnapshot(state));
  assert.deepEqual(exported, NAMED);
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
});

test('unnamed progress retains version one without a name field', () => {
  const game = createGame('np1-4-1');
  assert.equal(game.name, '');
  const exported: unknown = JSON.parse(encodeSnapshot(game));
  assert.deepEqual(exported, {
    version: 1,
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
  assert.equal(decodeSnapshot(encodeSnapshot(game))?.name, '');
  assert.equal(decodeSnapshot(encodeSnapshot({ ...game, name: 'Café' }))?.name, 'Café');
});

test('names round trip verbatim and survive card transitions and active time', () => {
  for (const name of [
    ' ',
    '  Café 🃏  ',
    '\t\0"\\<>',
    '\u2028\u2029',
    'e\u0301',
    'a'.repeat(40),
    '🃏'.repeat(20),
  ]) {
    const game = { ...createGame('np1-4-1'), name };
    const advanced = advanceGame(activateCard(activateCard(game, 0), 1), 125);
    assert.equal(advanced.name, name);
    assert.deepEqual(decodeSnapshot(encodeSnapshot(advanced)), advanced);
    assert.equal(game.moves, 0);
    assert.equal(game.elapsedMs, 0);
  }
});

test('named snapshots reject invalid names without relaxing version or key checks', () => {
  for (const name of ['', null, 123, [], {}, 'a'.repeat(41), '🃏'.repeat(20) + 'a', 'a\nb', 'a\rb'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, name })), null, JSON.stringify(name));
  for (const version of [0, 1, 3, '2', null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version })), null);
  for (const key of Object.keys(NAMED)) {
    const incomplete = Object.fromEntries(Object.entries(NAMED).filter(([field]) => field !== key));
    assert.equal(decodeSnapshot(JSON.stringify(incomplete)), null, `missing ${key}`);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, extra: true })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, version: 1, name: '' })), null);
});

test('named snapshots retain state constraints and whole-millisecond exports', () => {
  for (const override of [
    { elapsedMs: 360_000_000 },
    { moves: 1_000_000 },
    { moves: -1 },
    { elapsedMs: 0.5 },
    { started: false },
    { matched: [2, 6] },
    { selection: { kind: 'closed' } },
    { selection: { kind: 'one', index: 2, extra: true } },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED, ...override })), null);
  const mismatch = activateCard(activateCard({ ...createGame('np1-4-1'), name: 'Café' }, 0), 1);
  const saved = decodeSnapshot(encodeSnapshot(advanceGame(mismatch, 799.75)));
  assert.ok(saved);
  assert.equal(saved.name, 'Café');
  assert.equal(saved.elapsedMs, 799);
  assert.deepEqual(saved.selection, { kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
});

test('named snapshots enforce the UTF-8 byte boundary even with multibyte names', () => {
  const text = JSON.stringify({ ...NAMED, name: '🃏'.repeat(20) });
  assert.ok(Buffer.byteLength(text, 'utf8') > text.length);
  const padded = text + ' '.repeat(65_536 - Buffer.byteLength(text, 'utf8'));
  assert.equal(Buffer.byteLength(padded, 'utf8'), 65_536);
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});
