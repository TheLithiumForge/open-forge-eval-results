import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from './game.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  SNAPSHOT_NAME_MAX_CHARACTERS,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

function fields(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: SNAPSHOT_VERSION,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
    ...overrides,
  };
}

function snapshot(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify(fields(overrides));
}

test('a named snapshot returns its name and an unnamed one has none', () => {
  const state = { ...activateCard(createGame(EXAMPLE_CODE), 0), name: 'Friday warm-up' };
  const exported: unknown = JSON.parse(encodeSnapshot(state));
  assert.deepEqual(
    exported && typeof exported === 'object' && 'name' in exported && exported.name,
    'Friday warm-up',
  );
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
  const unnamed = createGame(EXAMPLE_CODE);
  assert.equal(snapshot().includes('name'), false);
  assert.equal(encodeSnapshot(unnamed).includes('"name"'), false);
  assert.equal(encodeSnapshot({ ...unnamed, name: '   ' }).includes('"name"'), false);
  assert.deepEqual(decodeSnapshot(snapshot()), unnamed);
  assert.deepEqual(decodeSnapshot(snapshot({ name: '' })), unnamed);
});

test('snapshot names trim, fit the limit and must be text', () => {
  assert.equal(decodeSnapshot(snapshot({ name: '  Rematch ' }))?.name, 'Rematch');
  const longest = 'n'.repeat(SNAPSHOT_NAME_MAX_CHARACTERS);
  assert.equal(decodeSnapshot(snapshot({ name: longest }))?.name, longest);
  assert.equal(decodeSnapshot(snapshot({ name: `${longest}n` })), null);
  for (const name of [1, null, ['a'], { a: 1 }, true])
    assert.equal(decodeSnapshot(snapshot({ name })), null);
});

test('pasted snapshots load with their fields reordered or a leading byte order mark', () => {
  const state = { ...activateCard(createGame(EXAMPLE_CODE), 0), name: 'Mixed' };
  const reversed = JSON.stringify(
    Object.fromEntries(
      Object.entries(
        fields({ name: 'Mixed', started: true, selection: { kind: SelectionKind.one, index: 0 } }),
      ).reverse(),
    ),
  );
  assert.deepEqual(decodeSnapshot(reversed), state);
  assert.deepEqual(decodeSnapshot(`﻿${encodeSnapshot(state)}`), state);
  const { moves: _moves, ...missing } = fields();
  assert.equal(decodeSnapshot(JSON.stringify(missing)), null);
  assert.equal(decodeSnapshot(snapshot({ extra: true, name: 'Extra' })), null);
});
