import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame, setDealName } from './game.ts';
import { DEAL_NAME_MAX_LENGTH } from './deal-name.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_KEYS,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_VERSION,
} from './snapshot.ts';
import { isJsonObject } from './saved-format.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';

const BASE = {
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: SelectionKind.closed },
  moves: 0,
  elapsedMs: 0,
  started: false,
};

test('snapshot properties may appear in different orders and names round trip in version 2', () => {
  const reordered = JSON.stringify({ ...BASE, version: SNAPSHOT_VERSION });
  assert.equal(decodeSnapshot(reordered)?.boardCode, EXAMPLE_CODE);

  const state = setDealName(createGame(EXAMPLE_CODE), ' Café ');
  const exported: unknown = JSON.parse(encodeSnapshot(state));
  assert.ok(isJsonObject(exported));
  assert.deepEqual(Object.keys(exported).sort(), [...NAMED_SNAPSHOT_KEYS].sort());
  assert.equal(exported.version, NAMED_SNAPSHOT_VERSION);
  assert.equal(exported.name, ' Café ');
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);

  const reorderedNamed = JSON.stringify({
    ...BASE,
    selection: { index: 0, kind: SelectionKind.one },
    started: true,
    name: 'Café',
    version: NAMED_SNAPSHOT_VERSION,
  });
  const restored = decodeSnapshot(reorderedNamed);
  assert.equal(restored?.name, 'Café');
  assert.deepEqual(restored?.selection, { kind: SelectionKind.one, index: 0 });
});

test('version 2 requires a valid name and version 1 has no name field', () => {
  assert.equal(decodeSnapshot(JSON.stringify({ ...BASE, version: NAMED_SNAPSHOT_VERSION })), null);
  for (const name of [
    '',
    'a'.repeat(DEAL_NAME_MAX_LENGTH + 1),
    'line\nbreak',
    'carriage\rreturn',
    7,
  ]) {
    assert.equal(
      decodeSnapshot(JSON.stringify({ ...BASE, version: NAMED_SNAPSHOT_VERSION, name })),
      null,
    );
  }
  assert.equal(
    decodeSnapshot(
      JSON.stringify({ ...BASE, version: NAMED_SNAPSHOT_VERSION, name: 'valid', extra: true }),
    ),
    null,
  );
  assert.equal(decodeSnapshot(JSON.stringify({ ...BASE, version: 3, name: 'Café' })), null);
  assert.equal(
    decodeSnapshot(JSON.stringify({ ...BASE, version: SNAPSHOT_VERSION, name: 'Café' })),
    null,
  );
});

test('deal names preserve allowed text and reject line breaks or overlong values', () => {
  const initial = createGame(EXAMPLE_CODE);
  const named = setDealName(initial, ' x '.padEnd(DEAL_NAME_MAX_LENGTH, 'é'));
  assert.equal(named.name.length, DEAL_NAME_MAX_LENGTH);
  assert.equal(setDealName(initial, '😀'.repeat(20)).name, '😀'.repeat(20));
  assert.equal(setDealName(initial, '😀'.repeat(21)), initial);
  assert.equal(setDealName(initial, 'x'.repeat(DEAL_NAME_MAX_LENGTH + 1)), initial);
  assert.equal(setDealName(initial, 'x\ny'), initial);
  assert.equal(setDealName(named, '').name, '');
});
