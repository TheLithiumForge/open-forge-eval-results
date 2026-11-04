import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame, createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';
import { isJsonObject } from './saved-format.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from './game.fixture.ts';

const initial = createGame(EXAMPLE_CODE);
const oneRevealed = advanceGame(activateCard(initial, 0), 123);
const pendingMismatch = advanceGame(activateCard(oneRevealed, 1), 175);
const completed = EXAMPLE_PAIRS.reduce(
  (state, [first, second]) => activateCard(activateCard(state, first), second),
  initial,
);

test('snapshots preserve progress with version in the middle or last', () => {
  for (const state of [initial, oneRevealed, pendingMismatch, completed]) {
    const canonical = encodeSnapshot(state);
    const expected = decodeSnapshot(canonical);
    assert.ok(expected, 'the original export loads');
    const value: unknown = JSON.parse(canonical);
    assert.ok(isJsonObject(value));
    const entries = Object.entries(value);
    const orders = [
      [...entries].reverse(),
      [...entries.slice(3), ...entries.slice(0, 3)],
      [...entries].sort(([left], [right]) => left.localeCompare(right)),
    ];
    for (const order of orders) {
      const text = JSON.stringify(Object.fromEntries(order));
      const decoded = decodeSnapshot(text);
      assert.deepEqual(decoded, expected, 'property order does not change imported progress');
      assert.ok(decoded);
      assert.equal(encodeSnapshot(decoded), canonical, 'export retains its canonical format');
    }
  }
});

test('reordered snapshots still reject missing, unknown and invalid fields', () => {
  const value: unknown = JSON.parse(encodeSnapshot(pendingMismatch));
  assert.ok(isJsonObject(value));
  const missing = Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'started'));
  const invalid = [
    missing,
    { ...value, extra: true },
    { ...value, version: 2 },
    { ...value, moves: -1 },
  ];
  for (const fields of invalid) {
    const text = JSON.stringify(Object.fromEntries(Object.entries(fields).reverse()));
    assert.equal(decodeSnapshot(text), null);
  }
});
