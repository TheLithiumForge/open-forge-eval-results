import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';
import { createGame } from './game.ts';

test('pasted snapshots accept reordered properties in both versions and every selection form', () => {
  for (const selection of [
    { kind: 'closed' },
    { index: 2, kind: 'one' },
    { remainingMs: 300, second: 1, first: 0, kind: 'mismatch' },
  ]) {
    for (const named of [false, true]) {
      const snapshot = {
        boardCode: 'np1-4-1',
        selection,
        elapsedMs: 1500,
        started: true,
        matched: [],
        moves: 2,
        version: named ? 2 : 1,
        ...(named ? { name: 'Café' } : {}),
      };
      const expected = { ...createGame('np1-4-1'), ...snapshot, name: named ? 'Café' : '' };
      const { version, ...state } = expected;
      assert.equal(version, named ? 2 : 1);
      const entries = Object.entries(snapshot);
      for (let offset = 0; offset < entries.length; offset++) {
        const rotated = [...entries.slice(offset), ...entries.slice(0, offset)];
        for (const ordered of [rotated, [...rotated].reverse()]) {
          const text = JSON.stringify(Object.fromEntries(ordered), null, 2);
          assert.deepEqual(decodeSnapshot(text), state);
          const invalid = { ...Object.fromEntries(ordered), extra: true };
          assert.equal(decodeSnapshot(JSON.stringify(invalid)), null);
        }
      }
    }
  }
});
