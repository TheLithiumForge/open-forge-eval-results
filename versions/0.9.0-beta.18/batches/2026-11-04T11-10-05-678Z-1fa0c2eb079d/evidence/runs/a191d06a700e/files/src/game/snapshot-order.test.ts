import assert from 'node:assert/strict';
import { test } from 'vitest';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';
import { decodeSnapshot } from './snapshot.ts';

const PROGRESS = [
  { matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false },
  { matched: [], selection: { index: 2, kind: 'one' }, moves: 0, elapsedMs: 0, started: true },
  {
    matched: [11, 0],
    selection: { remainingMs: 800, second: 2, first: 1, kind: 'mismatch' },
    moves: 2,
    elapsedMs: 0,
    started: true,
  },
  {
    matched: EXAMPLE_PAIRS.flat(),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 0,
    started: true,
  },
  // Validation checks declared state constraints without requiring a turn history.
  { matched: [], selection: { kind: 'closed' }, moves: 17, elapsedMs: 0, started: true },
];

for (const version of [1, 2]) {
  test(`version ${version} accepts reordered top-level and selection keys for every progress form`, () => {
    for (const progress of PROGRESS) {
      const fields = Object.entries({
        boardCode: EXAMPLE_CODE,
        ...progress,
        ...(version === 2 ? { name: ' Café ' } : {}),
        version,
      });
      const expected = decodeSnapshot(JSON.stringify(Object.fromEntries(fields)));
      assert.ok(expected, 'independently authored snapshot with version last is valid');
      assert.equal(expected.name, version === 2 ? ' Café ' : '');
      for (let offset = 0; offset < fields.length; offset += 1) {
        const rotated = [...fields.slice(offset), ...fields.slice(0, offset)];
        assert.deepEqual(decodeSnapshot(JSON.stringify(Object.fromEntries(rotated))), expected);
        assert.deepEqual(
          decodeSnapshot(JSON.stringify(Object.fromEntries(rotated.reverse()))),
          expected,
        );
      }
    }
  });
}
