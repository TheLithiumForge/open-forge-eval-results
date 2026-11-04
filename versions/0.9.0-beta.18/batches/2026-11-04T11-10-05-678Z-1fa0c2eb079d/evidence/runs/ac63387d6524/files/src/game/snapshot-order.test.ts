import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_KEYS } from './snapshot.ts';
import { EXAMPLE_CODE } from './game.fixture.ts';
import { SelectionKind } from './selection.ts';

test('snapshot fields load in every position regardless of where version appears', () => {
  const state = advanceGame(activateCard(activateCard(createGame(EXAMPLE_CODE), 0), 1), 175);
  const fields = {
    version: 1,
    boardCode: state.boardCode,
    matched: state.matched,
    selection: { remainingMs: 625, second: 1, first: 0, kind: SelectionKind.mismatch },
    moves: state.moves,
    elapsedMs: state.elapsedMs,
    started: state.started,
  };
  const entries = Object.entries(fields);
  for (let offset = 0; offset < entries.length; offset += 1) {
    const reordered = Object.fromEntries([...entries.slice(offset), ...entries.slice(0, offset)]);
    assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), state);
  }
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
});

test('snapshot exact keys reject missing fields even when an unknown field preserves the count', () => {
  const fields = {
    started: false,
    elapsedMs: 0,
    moves: 0,
    selection: { kind: SelectionKind.closed },
    matched: [],
    boardCode: EXAMPLE_CODE,
    version: 1,
  };
  assert.deepEqual(decodeSnapshot(JSON.stringify(fields)), createGame(EXAMPLE_CODE));
  for (const missing of SNAPSHOT_KEYS) {
    const remaining = Object.fromEntries(Object.entries(fields).filter(([key]) => key !== missing));
    assert.equal(decodeSnapshot(JSON.stringify(remaining)), null, `missing ${missing}`);
    assert.equal(
      decodeSnapshot(JSON.stringify({ ...remaining, extra: true })),
      null,
      `unknown field cannot replace ${missing}`,
    );
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...fields, extra: true })), null);
});
