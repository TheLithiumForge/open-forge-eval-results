import assert from 'node:assert/strict';
import { test } from 'vitest';
import { acceptedName, nameProblem, NameProblem } from './names.ts';

test('typed names are trimmed, keep one inner space and use composed Unicode', () => {
  assert.equal(acceptedName('  Mira  '), 'Mira');
  assert.equal(acceptedName('Ada   Lovelace'), 'Ada Lovelace');
  assert.equal(acceptedName('Ada\t\n Lovelace'), 'Ada Lovelace');
  assert.equal(acceptedName('Jean Luc'), 'Jean Luc');
  assert.equal(acceptedName('Café'), 'Café');
  assert.equal(acceptedName("O'Neil"), "O'Neil");
  assert.equal(acceptedName(acceptedName('  Ada   Lovelace ')), 'Ada Lovelace');
});

test('names need 2 to 20 code points in their accepted form', () => {
  const others = ['Bo', 'Cy', 'Di'];
  const length = (name: string) => nameProblem([name, ...others]);
  assert.equal(length(''), NameProblem.length);
  assert.equal(length('A'), NameProblem.length);
  assert.equal(length('Al'), null);
  assert.equal(length('A\u{1F600}'), null);
  assert.equal(length('a'.repeat(20)), null);
  assert.equal(length('a'.repeat(21)), NameProblem.length);
  assert.equal(length('\u{1F600}'.repeat(20)), null);
  assert.equal(length('\u{1F600}'.repeat(21)), NameProblem.length);
  assert.equal(nameProblem(['A', 'A', 'Cy', 'Di']), NameProblem.length);
});

test('a repeat anywhere in the group blocks it whatever its capitalization', () => {
  assert.equal(nameProblem(['Mira', 'Bo', 'Cy', 'Mira']), NameProblem.repeat);
  assert.equal(nameProblem(['Mira', 'Bo', 'Cy', 'mira']), NameProblem.repeat);
  assert.equal(nameProblem(['Mira', 'MIRA', 'Cy', 'Di']), NameProblem.repeat);
  assert.equal(nameProblem(['Straße', 'STRASSE', 'Cy', 'Di']), NameProblem.repeat);
  assert.equal(nameProblem(['Mira', 'Myra', 'Cy', 'Di']), null);
  assert.equal(nameProblem(['René', 'Rene', 'Cy', 'Di']), null);
});
