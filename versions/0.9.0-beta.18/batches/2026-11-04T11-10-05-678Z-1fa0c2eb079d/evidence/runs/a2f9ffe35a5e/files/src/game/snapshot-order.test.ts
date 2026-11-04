import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot } from './snapshot.ts';

// These literal fixtures have never passed through the game's snapshot encoder.
const UNNAMED = {
  boardCode: 'np1-4-1',
  matched: [11, 0],
  selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
  moves: 2,
  elapsedMs: 1500,
  started: true,
  version: 1,
};

test('pasted version one and named version two snapshots accept every top-level key first', () => {
  for (const fixture of [UNNAMED, { ...UNNAMED, name: '  Café  ', version: 2 }]) {
    const entries = Object.entries(fixture);
    for (let offset = 0; offset < entries.length; offset++) {
      const reordered = Object.fromEntries([...entries.slice(offset), ...entries.slice(0, offset)]);
      const restored = decodeSnapshot(JSON.stringify(reordered));
      assert.ok(restored, `accept first key ${entries[offset]?.[0]}`);
      assert.equal(restored.name, fixture.version === 2 ? '  Café  ' : '');
      assert.deepEqual(restored.matched, [11, 0]);
      assert.deepEqual(restored.selection, {
        kind: 'mismatch',
        first: 1,
        second: 2,
        remainingMs: 300,
      });
      assert.equal(restored.moves, 2);
      assert.equal(restored.elapsedMs, 1500);
      assert.equal(restored.started, true);
    }
  }
});

test('reordered snapshots still reject unknown and missing top-level or selection fields', () => {
  for (const fixture of [UNNAMED, { ...UNNAMED, name: 'Café', version: 2 }]) {
    assert.equal(decodeSnapshot(JSON.stringify({ unexpected: true, ...fixture })), null);
    for (const key of Object.keys(fixture)) {
      const missing = Object.fromEntries(
        Object.entries(fixture).filter(([field]) => field !== key),
      );
      assert.equal(decodeSnapshot(JSON.stringify(missing)), null, `missing ${key}`);
      assert.equal(
        decodeSnapshot(JSON.stringify({ unexpected: true, ...missing })),
        null,
        `unknown field replacing ${key}`,
      );
    }
  }
  assert.equal(
    decodeSnapshot(
      JSON.stringify({ ...UNNAMED, selection: { ...UNNAMED.selection, extra: true } }),
    ),
    null,
  );
  const selection = Object.fromEntries(
    Object.entries(UNNAMED.selection).filter(([key]) => key !== 'remainingMs'),
  );
  assert.equal(decodeSnapshot(JSON.stringify({ ...UNNAMED, selection })), null);
});
