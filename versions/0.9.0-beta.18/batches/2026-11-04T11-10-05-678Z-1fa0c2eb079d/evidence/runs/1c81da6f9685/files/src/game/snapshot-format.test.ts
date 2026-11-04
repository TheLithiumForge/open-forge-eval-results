import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { DEAL_NAME_MAX_CODE_UNITS, isValidDealName } from './deal-name.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_VERSION } from './snapshot.ts';
import { SelectionKind } from './selection.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';
import { isJsonObject } from './saved-format.ts';

function validSnapshot(version = SNAPSHOT_VERSION): Record<string, unknown> {
  return {
    version,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.closed },
    moves: 0,
    elapsedMs: 0,
    started: false,
  };
}

function reorder(value: Record<string, unknown>, versionPosition: number): string {
  const fields = Object.keys(value).filter((key) => key !== 'version');
  fields.splice(versionPosition, 0, 'version');
  return JSON.stringify(Object.fromEntries(fields.map((key) => [key, value[key]])));
}

test('snapshot versions accept the version field in every property position', () => {
  const unnamed = validSnapshot();
  const named = { ...validSnapshot(2), name: 'Café' };
  const sources: readonly Record<string, unknown>[] = [unnamed, named];
  for (const source of sources) {
    for (let position = 0; position < Object.keys(source).length; position++) {
      const decoded = decodeSnapshot(reorder(source, position));
      assert.ok(decoded, `version can appear at property position ${position}`);
      assert.equal(decoded.name, source.name ?? '');
    }
  }
});

test('snapshot versions still require their exact keys and reject unsupported versions', () => {
  const unnamed = validSnapshot();
  const named = { ...validSnapshot(2), name: 'Café' };
  const sources: readonly Record<string, unknown>[] = [unnamed, named];
  for (const source of sources) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...source, extra: true })), null);
    assert.equal(decodeSnapshot(JSON.stringify({ ...source, 0: true })), null);
    const missing: Record<string, unknown> = { ...source };
    delete missing.started;
    assert.equal(decodeSnapshot(JSON.stringify(missing)), null);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...validSnapshot(3), name: 'Café' })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...validSnapshot(), name: 'Legacy extra' })), null);
});

test('deal names keep spaces and allow forty UTF-16 code units only', () => {
  const boundary = '😀'.repeat(DEAL_NAME_MAX_CODE_UNITS / 2);
  assert.equal(boundary.length, DEAL_NAME_MAX_CODE_UNITS);
  assert.equal(isValidDealName(''), true, 'clearing the editor is allowed');
  assert.equal(isValidDealName('  Café  '), true);
  assert.equal(isValidDealName(boundary), true);
  assert.equal(isValidDealName(`${boundary}😀`), false);
  assert.equal(isValidDealName('a\rb'), false);
  assert.equal(isValidDealName('a\nb'), false);
  assert.equal(isValidDealName(null), false);
  assert.equal(isValidDealName(1), false);
});

test('version two requires a nonempty name that follows the deal-name rules', () => {
  const named = { ...validSnapshot(2), name: ' Café ' };
  assert.equal(decodeSnapshot(JSON.stringify(named))?.name, ' Café ');
  for (const name of ['', null, 1, 'a\rb', 'a\nb', 'x'.repeat(41)]) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...named, name })), null);
  }
  const missing: Record<string, unknown> = { ...named };
  delete missing.name;
  assert.equal(decodeSnapshot(JSON.stringify(missing)), null);
});

test('named snapshots retain saved progress and names through game transitions', () => {
  const first = activateCard(createGame(EXAMPLE_CODE), 0);
  const mismatch = advanceGame(activateCard(first, 1), 175);
  const namedMismatch = { ...mismatch, name: 'Round one 😀' };
  assert.deepEqual(decodeSnapshot(encodeSnapshot(namedMismatch)), namedMismatch);
  const progressed = advanceGame(namedMismatch, 1);
  assert.equal(progressed.name, namedMismatch.name);
  assert.deepEqual(decodeSnapshot(encodeSnapshot(progressed)), progressed);
  const pair = activateCard(activateCard(createGame(EXAMPLE_CODE), 2), 6);
  const namedPair = { ...pair, name: '  Café  ' };
  assert.deepEqual(decodeSnapshot(encodeSnapshot(namedPair)), namedPair);
  assert.equal(activateCard(namedPair, 0).name, namedPair.name);
  const exported: unknown = JSON.parse(encodeSnapshot(namedPair));
  assert.ok(isJsonObject(exported));
  assert.equal(exported.version, 2);
});

test('version one snapshots remain unnamed and accept a started zero-move reveal', () => {
  const state = activateCard(createGame(EXAMPLE_CODE), 0);
  const restored = decodeSnapshot(encodeSnapshot(state));
  assert.deepEqual(restored, state);
  assert.equal(restored?.name, '');
  assert.equal(restored?.moves, 0);
  assert.equal(restored?.selection.kind, SelectionKind.one);
});

test('named snapshots keep state validation for all progress fields', () => {
  const named = {
    ...validSnapshot(2),
    name: 'Saved',
    started: true,
    moves: 0,
    selection: { kind: SelectionKind.one, index: 0 },
  };
  assert.ok(
    decodeSnapshot(JSON.stringify(named)),
    'the invalid variants start from valid progress',
  );
  const invalid = [
    { boardCode: 'bad' },
    { matched: [0], moves: 1, selection: { kind: SelectionKind.one, index: 3 } },
    { selection: { kind: SelectionKind.one, index: 16 } },
    { moves: -1 },
    { elapsedMs: Number.MAX_SAFE_INTEGER + 1 },
    { started: 'true' },
  ];
  for (const override of invalid) {
    assert.equal(decodeSnapshot(JSON.stringify({ ...named, ...override })), null);
  }
});
