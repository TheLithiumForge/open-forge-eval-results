import assert from 'node:assert/strict';
import { test } from 'vitest';
import { checkNames, hasRepeatedName, isValidNameLength, normalizeName } from './names.ts';

test('a name is trimmed, collapsed to single spaces and composed', () => {
  assert.equal(normalizeName('  Mira  '), 'Mira');
  assert.equal(normalizeName('Ada   Lovelace'), 'Ada Lovelace');
  assert.equal(normalizeName('Jean Luc'), 'Jean Luc');
  assert.equal(normalizeName("O'Neil"), "O'Neil");
  assert.equal(normalizeName('Café'), 'Café');
});

test('normalizing an accepted name again changes nothing', () => {
  for (const draft of ['  Ada \t Lovelace ', 'Café  au  lait', ' Mira '])
    assert.equal(normalizeName(normalizeName(draft)), normalizeName(draft));
});

test('a name has two to twenty code points', () => {
  assert.equal(isValidNameLength(''), false);
  assert.equal(isValidNameLength('A'), false);
  assert.equal(isValidNameLength('Al'), true);
  assert.equal(isValidNameLength('A\u{1f600}'), true);
  assert.equal(isValidNameLength('a'.repeat(20)), true);
  assert.equal(isValidNameLength('a'.repeat(21)), false);
  assert.equal(isValidNameLength('\u{1f600}'.repeat(20)), true);
  assert.equal(isValidNameLength('\u{1f600}'.repeat(21)), false);
});

test('the length is counted after the name is processed', () => {
  assert.deepEqual(checkNames(['  Al  ', 'Bo', 'Cy', 'Di']), {
    ok: true,
    names: ['Al', 'Bo', 'Cy', 'Di'],
  });
  assert.deepEqual(checkNames([' A ', 'Bo', 'Cy', 'Di']), {
    ok: false,
    notice: 'Use 2 to 20 characters.',
  });
});

test('names compare without regard to case and keep the spelling that was typed', () => {
  assert.equal(hasRepeatedName(['Mira', 'mira']), true);
  assert.equal(hasRepeatedName(['Mira', 'MIRA']), true);
  assert.equal(hasRepeatedName(['Mira', 'Mirabel']), false);
  assert.deepEqual(checkNames(['Mira', 'Bo', 'Cy', 'mira']), {
    ok: false,
    notice: 'Each name must be different.',
  });
  assert.deepEqual(checkNames(['Ada  Lovelace', 'Bo', 'Cy', 'ada lovelace']), {
    ok: false,
    notice: 'Each name must be different.',
  });
  assert.deepEqual(checkNames(['Mira', 'Bo', 'Cy', 'Di']), {
    ok: true,
    names: ['Mira', 'Bo', 'Cy', 'Di'],
  });
});
