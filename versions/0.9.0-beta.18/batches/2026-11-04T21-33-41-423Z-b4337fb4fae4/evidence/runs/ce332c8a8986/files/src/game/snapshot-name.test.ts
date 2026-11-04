import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from './game.ts';
import { decodeSnapshot, encodeSnapshot } from './snapshot.ts';

const base = {
  boardCode: 'np1-4-1',
  matched: [],
  selection: { kind: 'one', index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};

test('accepts either snapshot version regardless of property order and preserves names', () => {
  const game = activateCard(createGame(base.boardCode), 2);
  const unnamed = JSON.stringify({ ...base, version: 1 });
  assert.deepEqual(decodeSnapshot(unnamed), game);
  const name = '  Café 🎮  ';
  const named = JSON.stringify({ name, ...base, version: 2 });
  assert.deepEqual(decodeSnapshot(named), { ...game, name });
  assert.deepEqual(decodeSnapshot(encodeSnapshot({ ...game, name })), { ...game, name });
  assert.deepEqual(JSON.parse(encodeSnapshot(game)), { version: 1, ...base });
  assert.ok(decodeSnapshot(JSON.stringify({ ...base, name: '🎮'.repeat(20), version: 2 })));
});

test('enforces version-specific fields and name limits', () => {
  for (const fields of [
    { version: 1, name: 'name' },
    { version: 2 },
    { version: 2, name: '' },
    { version: 2, name: 12 },
    { version: 2, name: 'x'.repeat(41) },
    { version: 2, name: '🎮'.repeat(21) },
    { version: 2, name: 'a\nb' },
    { version: 2, name: 'a\rb' },
    { version: 2, name: 'ok', extra: true },
    { version: 3, name: 'ok' },
  ])
    assert.equal(decodeSnapshot(JSON.stringify({ ...base, ...fields })), null);
});
