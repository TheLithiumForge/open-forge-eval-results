import assert from 'node:assert/strict';
import { test } from 'vitest';
import { nameProblem, normalizeName, NameNotice } from './names.ts';

test('a name is trimmed, collapsed and composed', () => {
  assert.equal(normalizeName('  Mira  '), 'Mira');
  assert.equal(normalizeName('Ada   Lovelace'), 'Ada Lovelace');
  assert.equal(normalizeName('Café'), 'Café');
  assert.equal(normalizeName("O'Neil"), "O'Neil");
  assert.equal(normalizeName(normalizeName(' Ada \t Lovelace ')), 'Ada Lovelace');
});

test('names of two to twenty code points pass at both ends', () => {
  assert.equal(nameProblem(['Al', 'A\u{1F600}', 'x'.repeat(20), '\u{1F600}'.repeat(20)]), null);
});

test('names outside two to twenty code points are blocked', () => {
  for (const bad of ['', '   ', 'A', 'x'.repeat(21), '\u{1F600}'.repeat(21)])
    assert.equal(nameProblem(['Ada', bad]), NameNotice.length);
});

test('length is counted after normalization', () => {
  assert.equal(nameProblem([`  ${'x'.repeat(20)}  `, 'Bo']), null);
  assert.equal(nameProblem(['  A  ', 'Bo']), NameNotice.length);
});

test('a repeat is found without regard to case across the whole group', () => {
  assert.equal(nameProblem(['Mira', 'Bo', 'Cora', 'mira']), NameNotice.duplicate);
  assert.equal(nameProblem(['Ada Lovelace', 'Bo', 'ADA   LOVELACE']), NameNotice.duplicate);
  assert.equal(nameProblem(['Mira', 'Mirá']), null);
});

test('a length failure wins when a repeat is also present', () => {
  assert.equal(nameProblem(['Mira', 'mira', 'A']), NameNotice.length);
});
