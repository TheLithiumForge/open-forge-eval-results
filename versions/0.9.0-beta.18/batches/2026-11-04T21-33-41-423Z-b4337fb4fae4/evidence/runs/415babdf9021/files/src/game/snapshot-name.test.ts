import assert from 'node:assert/strict';
import { test } from 'vitest';
import { decodeSnapshot, encodeSnapshot, NAMED_SNAPSHOT_VERSION } from './snapshot.ts';

function snapshot(overrides: Record<string, unknown>): string {
  return JSON.stringify({
    version: 1,
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
    ...overrides,
  });
}

test('snapshot keys can appear in different orders and names round trip without normalization', () => {
  const text =
    '{"started":true,"moves":0,"name":" Café ","selection":{"index":2,"kind":"one"},"elapsedMs":0,"matched":[],"boardCode":"np1-4-1","version":2}';
  const state = decodeSnapshot(text);
  assert.ok(state);
  assert.equal(state.name, ' Café ');
  const exported = JSON.parse(encodeSnapshot(state));
  assert.equal(exported.version, NAMED_SNAPSHOT_VERSION);
  assert.equal(exported.name, ' Café ');
  assert.deepEqual(decodeSnapshot(encodeSnapshot(state)), state);
  assert.ok(
    decodeSnapshot(
      '{"started":false,"elapsedMs":0,"moves":0,"selection":{"kind":"closed"},"matched":[],"boardCode":"np1-4-1","version":1}',
    ),
  );
});

test('named snapshots require a valid nonempty name and exact versioned keys', () => {
  for (const name of ['', 'x'.repeat(41), 'a\nb', 'a\rb', 42, null]) {
    assert.equal(decodeSnapshot(snapshot({ version: 2, name })), null);
  }
  for (const name of [' '.repeat(40), '😀'.repeat(20), ' Café ']) {
    assert.equal(decodeSnapshot(snapshot({ version: 2, name }))?.name, name);
  }
  assert.equal(decodeSnapshot(snapshot({ version: 1, name: 'name' })), null);
  assert.equal(decodeSnapshot(snapshot({ version: 2, name: 'name', extra: true })), null);
  assert.equal(decodeSnapshot(snapshot({ version: 3, name: 'name' })), null);
});
