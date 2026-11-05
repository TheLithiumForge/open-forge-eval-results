import assert from 'node:assert/strict';
import { test } from 'vitest';
import { nameErrors, normalizeName } from './names.ts';

test('accepted names collapse whitespace and use NFC without changing spelling or case', () => {
  assert.equal(normalizeName('  Ada \t\n Lovelace  '), 'Ada Lovelace');
  assert.equal(normalizeName('Cafe\u0301'), 'Café');
  assert.equal(normalizeName(" O'Neil "), "O'Neil");
});

test('name lengths count normalized Unicode code points with inclusive bounds', () => {
  assert.deepEqual(nameErrors(['', 'A', '  Al  ', 'A😀', '😀'.repeat(20), '😀'.repeat(21)]), [
    'Use 2 to 20 characters.',
    'Use 2 to 20 characters.',
    '',
    '',
    '',
    'Use 2 to 20 characters.',
  ]);
  assert.deepEqual(nameErrors(['Cafe\u0301', 'Ada']), ['', '']);
});

test('duplicate checks cover the whole group after normalization and ignore case', () => {
  assert.deepEqual(nameErrors(['Mira', 'Bo', ' MIRA ', 'Cora']), [
    'Each name must be different.',
    '',
    'Each name must be different.',
    '',
  ]);
  assert.deepEqual(nameErrors(['Café', 'Cafe\u0301']), [
    'Each name must be different.',
    'Each name must be different.',
  ]);
  assert.deepEqual(nameErrors(['Cafe', 'Café']), ['', '']);
});
