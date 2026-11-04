import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import {
  decodeSnapshot,
  encodeSnapshot,
  NAMED_SNAPSHOT_VERSION,
  SNAPSHOT_MAX_BYTES,
} from './snapshot.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';

const NAMED_PROGRESS = {
  version: 2,
  name: 'Café',
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: 'one', index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};

test('the documented named snapshot restores its name and revealed card', () => {
  assert.equal(NAMED_SNAPSHOT_VERSION, 2);
  assert.deepEqual(decodeSnapshot(JSON.stringify(NAMED_PROGRESS)), {
    ...activateCard(createGame(EXAMPLE_CODE), 2),
    name: 'Café',
  });
});

test('named snapshot imports accept every field first or last without losing name characters', () => {
  for (const name of ['  Café  ', ' \t ', '🃏'.repeat(20), 'x'.repeat(40), 'e\u0301', '\u0000']) {
    const entries = Object.entries({ ...NAMED_PROGRESS, name });
    for (let offset = 0; offset < entries.length; offset++) {
      const rotated = [...entries.slice(offset), ...entries.slice(0, offset)];
      for (const fields of [rotated, [...rotated].reverse()]) {
        const restored = decodeSnapshot(JSON.stringify(Object.fromEntries(fields)));
        assert.ok(restored);
        assert.equal(restored.name, name);
        assert.equal(decodeSnapshot(encodeSnapshot(restored))?.name, name);
      }
    }
  }
});

test('named progress round trips across hidden, revealed, mismatched, matched and completed states', () => {
  const initial = { ...createGame(EXAMPLE_CODE), name: '  Café 🃏  ' };
  const first = activateCard(initial, 0);
  const mismatch = activateCard(first, 1);
  const pending = advanceGame(mismatch, 175);
  const closed = advanceGame(pending, 625);
  const matched = activateCard(activateCard(closed, 2), 6);
  let completed = initial;
  for (const pair of EXAMPLE_PAIRS)
    for (const index of pair) completed = activateCard(completed, index);
  for (const state of [initial, first, mismatch, pending, closed, matched, completed]) {
    assert.equal(state.name, initial.name);
    const expected = { ...state, matched: [...state.matched].sort((a, b) => a - b) };
    assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), expected);
    assert.deepEqual(JSON.parse(encodeSnapshot(state)), {
      version: 2,
      name: initial.name,
      boardCode: EXAMPLE_CODE,
      matched: expected.matched,
      selection: state.selection,
      moves: state.moves,
      elapsedMs: state.elapsedMs,
      started: state.started,
    });
  }
  const unnamed = { ...matched, name: '' };
  assert.deepEqual(JSON.parse(encodeSnapshot(unnamed)), {
    version: 1,
    boardCode: EXAMPLE_CODE,
    matched: [2, 6],
    selection: { kind: 'closed' },
    moves: 2,
    elapsedMs: 800,
    started: true,
  });
  assert.equal(decodeSnapshot(encodeSnapshot(unnamed))?.name, '');
});

test('named snapshots reject invalid names, mixed versions and missing or unknown fields', () => {
  for (const name of ['', null, 1, false, [], {}, 'x'.repeat(41), '🃏'.repeat(21), '\r', '\n'])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED_PROGRESS, name })), null);
  for (const version of [1, 0, 3, '2', null])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED_PROGRESS, version })), null);
  const entries = Object.entries(NAMED_PROGRESS);
  for (const [key] of entries) {
    const without = Object.fromEntries(entries.filter(([field]) => field !== key));
    assert.equal(decodeSnapshot(JSON.stringify(without)), null);
    assert.equal(decodeSnapshot(JSON.stringify({ ...without, extra: true })), null);
  }
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED_PROGRESS, extra: true })), null);
  assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED_PROGRESS, version: 1, name: '' })), null);
});

test('named snapshots still validate counters, pairs, selections and started state', () => {
  for (const fields of [
    { elapsedMs: 360_000_000 },
    { moves: 1_000_000 },
    { moves: -1 },
    { elapsedMs: 0.5 },
    { matched: [0, 1], moves: 1 },
    { matched: [0, 11] },
    { selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 0 }, moves: 1 },
    { selection: { kind: 'one', index: 16 } },
    { selection: { kind: 'one', index: 2, extra: true } },
    { selection: { kind: 'closed' } },
    { started: false },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...NAMED_PROGRESS, ...fields })), null);
});

test('named snapshots enforce the UTF-8 byte boundary with multibyte names', () => {
  const text = JSON.stringify({ ...NAMED_PROGRESS, name: '🃏'.repeat(20) });
  const padded = text + ' '.repeat(SNAPSHOT_MAX_BYTES - Buffer.byteLength(text, 'utf8'));
  assert.ok(padded.length < SNAPSHOT_MAX_BYTES);
  assert.ok(decodeSnapshot(padded));
  assert.equal(decodeSnapshot(padded + ' '), null);
});
