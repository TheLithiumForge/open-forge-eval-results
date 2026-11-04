import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { renameGame } from './deal-name.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_KEYS,
  SNAPSHOT_MAX_BYTES,
} from './snapshot.ts';
import { replayGame } from './replay.ts';

function snapshot(version: number, overrides: Record<string, unknown> = {}) {
  return {
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
    version,
    ...overrides,
  };
}

test('named snapshots round trip initial, revealed, pending and completed progress', () => {
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  const initial = createGame(EXAMPLE_CODE);
  const one = activateCard(initial, 0);
  const pending = advanceGame(activateCard(one, 1), 175);
  let completed = initial;
  for (const [first, second] of EXAMPLE_PAIRS)
    completed = activateCard(activateCard(completed, first), second);
  for (const state of [initial, one, pending, completed]) {
    const named = renameGame(state, '  Café 🎲  ');
    const text = encodeSnapshot(named);
    const exported: unknown = JSON.parse(text);
    assert.ok(exported && typeof exported === 'object');
    assert.deepEqual(Object.keys(exported).sort(), [...SNAPSHOT_KEYS, 'name'].sort());
    assert.deepEqual(decodeSnapshot(text), {
      ...named,
      matched: state === completed ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] : [],
    });
    assert.match(text, /"version": 2/);
    assert.match(encodeSnapshot(renameGame(named, '')), /"version": 1/);
  }
});

test('snapshots accept exact fields in every starting position and reversed order', () => {
  for (const value of [snapshot(1), snapshot(2, { name: 'Café' })]) {
    const entries = Object.entries(value);
    const expected = decodeSnapshot(JSON.stringify(value));
    assert.ok(expected, 'version can come after the progress fields');
    for (let first = 0; first < entries.length; first++) {
      const reordered = Object.fromEntries([...entries.slice(first), ...entries.slice(0, first)]);
      assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), expected);
    }
    assert.deepEqual(
      decodeSnapshot(JSON.stringify(Object.fromEntries([...entries].reverse()))),
      expected,
    );
    for (const missing of Object.keys(value)) {
      const incomplete = Object.fromEntries(entries.filter(([key]) => key !== missing));
      assert.equal(decodeSnapshot(JSON.stringify(incomplete)), null, `missing ${missing}`);
    }
    assert.equal(decodeSnapshot(JSON.stringify({ unknown: true, ...value })), null);
  }
});

test('snapshot versions enforce their exact name fields without trimming or normalizing', () => {
  assert.equal(decodeSnapshot(JSON.stringify(snapshot(1)))?.name, '');
  for (const name of [' ', '  Café  ', '🎲'.repeat(20), 'é'.repeat(40), '\u0000\u2028\u2029'])
    assert.equal(decodeSnapshot(JSON.stringify(snapshot(2, { name })))?.name, name);
  for (const name of ['', null, 1, [], {}, 'a'.repeat(41), '🎲'.repeat(21), 'a\rb', 'a\nb'])
    assert.equal(decodeSnapshot(JSON.stringify(snapshot(2, { name }))), null);
  assert.equal(decodeSnapshot(JSON.stringify(snapshot(2))), null);
  assert.equal(decodeSnapshot(JSON.stringify(snapshot(1, { name: 'Café' }))), null);
  for (const version of [0, 3, -1, 1.5, '1', '2', null])
    assert.equal(
      decodeSnapshot(JSON.stringify({ ...snapshot(2, { name: 'Café' }), version })),
      null,
    );
});

test('named snapshots retain state validation and count their UTF-8 bytes', () => {
  const valid = snapshot(2, { name: 'é'.repeat(40) });
  const text = JSON.stringify(valid);
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
  for (const overrides of [
    { moves: -1 },
    { elapsedMs: 360_000_000 },
    { started: true },
    { matched: [0] },
    { selection: { kind: 'one', index: 0 } },
    { selection: { kind: 'closed', unknown: 1 } },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...valid, ...overrides })), null);
});

test('snapshot validation permits stated progress without reconstructing earlier turns', () => {
  for (const version of [1, 2]) {
    const name = version === 2 ? { name: 'Café' } : {};
    assert.ok(
      decodeSnapshot(JSON.stringify(snapshot(version, { ...name, started: true, moves: 1 }))),
    );
    assert.ok(
      decodeSnapshot(
        JSON.stringify(
          snapshot(version, {
            ...name,
            started: true,
            matched: [0, 11],
            moves: 1,
            elapsedMs: 0,
            selection: { index: 2, kind: 'one' },
          }),
        ),
      ),
    );
  }
});

test('version one replays still export unnamed version one snapshots', () => {
  const state = replayGame(
    JSON.stringify({
      version: 1,
      boardCode: EXAMPLE_CODE,
      actions: [{ atMs: 0, index: 0 }],
      endMs: 10,
    }),
  );
  assert.ok(state);
  assert.equal(state.name, '');
  const exported: unknown = JSON.parse(encodeSnapshot(state));
  assert.ok(exported && typeof exported === 'object');
  assert.deepEqual(Object.keys(exported).sort(), [...SNAPSHOT_KEYS].sort());
  assert.match(encodeSnapshot(state), /"version": 1/);
});
