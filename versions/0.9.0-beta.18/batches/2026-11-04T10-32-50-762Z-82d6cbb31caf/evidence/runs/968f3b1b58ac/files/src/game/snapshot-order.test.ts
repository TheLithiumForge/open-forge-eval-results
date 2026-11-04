import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { decodeSnapshot } from './snapshot.ts';

const SNAPSHOT = {
  boardCode: 'np1-4-1',
  matched: [0, 11],
  selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
  moves: 2,
  elapsedMs: 1500,
  started: true,
  version: 1,
};

test('snapshot field order does not affect valid pasted progress', () => {
  let state = createGame('np1-4-1');
  for (const index of [0, 11, 1, 2]) state = activateCard(state, index);
  const expected = { ...advanceGame(state, 500), elapsedMs: 1500 };
  const entries = Object.entries(SNAPSHOT);
  for (let offset = 0; offset < entries.length; offset++) {
    const reordered = Object.fromEntries([...entries.slice(offset), ...entries.slice(0, offset)]);
    assert.deepEqual(decodeSnapshot(JSON.stringify(reordered)), expected);
    assert.deepEqual(decodeSnapshot(JSON.stringify(reordered, null, 2)), expected);
  }
});

test('reordered snapshots still require every field and reject unknown fields', () => {
  for (const field of Object.keys(SNAPSHOT)) {
    const incomplete = Object.fromEntries(
      Object.entries(SNAPSHOT).filter(([key]) => key !== field),
    );
    assert.equal(decodeSnapshot(JSON.stringify(incomplete)), null, field);
  }
  for (const key of ['extra', 'constructor', '__proto__']) {
    assert.equal(decodeSnapshot(JSON.stringify({ [key]: true, ...SNAPSHOT })), null, key);
  }
});
