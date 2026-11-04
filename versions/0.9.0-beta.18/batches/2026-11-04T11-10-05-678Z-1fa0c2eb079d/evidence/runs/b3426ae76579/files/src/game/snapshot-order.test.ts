import assert from 'node:assert/strict';
import { test } from 'vitest';
import { EXAMPLE_CODE } from './game.fixture.ts';
import { decodeSnapshot } from './snapshot.ts';

test('snapshot properties accept arbitrary ordering for both versions', () => {
  const unnamed = JSON.stringify({
    boardCode: EXAMPLE_CODE,
    version: 1,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
  const named = JSON.stringify({
    boardCode: EXAMPLE_CODE,
    name: 'Imported game',
    version: 2,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
  assert.equal(decodeSnapshot(unnamed)?.name, '');
  assert.equal(decodeSnapshot(named)?.name, 'Imported game');
});

test('selection properties accept arbitrary ordering', () => {
  const text = JSON.stringify({
    boardCode: EXAMPLE_CODE,
    moves: 1,
    version: 2,
    selection: { remainingMs: 300, second: 1, kind: 'mismatch', first: 0 },
    matched: [],
    started: true,
    elapsedMs: 1500,
    name: 'Pasted game',
  });
  const restored = decodeSnapshot(text);
  assert.equal(restored?.name, 'Pasted game');
  assert.deepEqual(restored?.selection, {
    kind: 'mismatch',
    first: 0,
    second: 1,
    remainingMs: 300,
  });
});
