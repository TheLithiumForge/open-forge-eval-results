import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame, GAME_NAME_MAX_LENGTH } from './game.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';
import { SelectionKind } from './selection.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_KEYS, SNAPSHOT_VERSION } from './snapshot.ts';

function snapshot(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
    ...overrides,
  });
}

test('legacy snapshots stay unnamed and exports keep the original fields', () => {
  const loaded = decodeSnapshot(snapshot());
  assert.equal(loaded?.name, '');
  const exported: unknown = JSON.parse(encodeSnapshot(createGame(EXAMPLE_CODE)));
  assert.ok(exported && typeof exported === 'object');
  assert.deepEqual(Object.keys(exported).sort(), [...SNAPSHOT_KEYS].sort());
});

test('snapshot names round trip Unicode and enforce the shared length limit', () => {
  const name = 'Déjà vu “match” 🚀';
  const state = { ...createGame(EXAMPLE_CODE), name };
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
  assert.equal(
    decodeSnapshot(snapshot({ name: 'x'.repeat(GAME_NAME_MAX_LENGTH) }))?.name.length,
    120,
  );
  assert.equal(decodeSnapshot(snapshot({ name: 'x'.repeat(GAME_NAME_MAX_LENGTH + 1) })), null);
});

test('snapshots load regardless of top-level or selection field order', () => {
  const loaded = decodeSnapshot(
    JSON.stringify({
      started: true,
      selection: { remainingMs: 400, second: 1, kind: SelectionKind.mismatch, first: 0 },
      elapsedMs: 50,
      moves: 1,
      matched: [],
      boardCode: EXAMPLE_CODE,
      name: 'Pasted save',
      version: SNAPSHOT_VERSION,
    }),
  );
  assert.equal(loaded?.name, 'Pasted save');
  assert.equal(loaded?.selection.kind, SelectionKind.mismatch);
});

test('snapshot names must be strings within the limit and unknown fields stay invalid', () => {
  for (const name of [null, 3, {}, []]) assert.equal(decodeSnapshot(snapshot({ name })), null);
  assert.equal(decodeSnapshot(snapshot({ extra: true })), null);
});
