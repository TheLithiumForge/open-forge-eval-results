import assert from 'node:assert/strict';
import { test } from 'vitest';
import { acceptedName, isNameGroup, nameProblem, NameProblem } from './names.ts';

test('a typed name is trimmed, its inner spacing collapsed and composed', () => {
  assert.equal(acceptedName('  Mira  '), 'Mira');
  assert.equal(acceptedName('Ada   Lovelace'), 'Ada Lovelace');
  assert.equal(acceptedName('Jean\tLuc'), 'Jean Luc');
  assert.equal(acceptedName('Café'), 'Café');
  assert.equal(acceptedName("O'Neil"), "O'Neil");
  assert.equal(acceptedName(acceptedName(' Ada   Lovelace ')), 'Ada Lovelace');
});

test('names need 2 to 20 code points after processing', () => {
  const group = (name: string) => nameProblem([name, 'Other']);
  assert.equal(group(''), NameProblem.length);
  assert.equal(group('A'), NameProblem.length);
  assert.equal(group('Al'), null);
  assert.equal(group('A\u{1F600}'), null, 'two code points in three code units');
  assert.equal(group('a'.repeat(20)), null);
  assert.equal(group('a'.repeat(21)), NameProblem.length);
  assert.equal(group('\u{1F600}'.repeat(20)), null, 'forty code units');
  assert.equal(group(acceptedName('  A  ')), NameProblem.length);
});

test('repeats in a group are found without regard to case or position', () => {
  assert.equal(nameProblem(['Mira', 'Mira']), NameProblem.repeat);
  assert.equal(nameProblem(['Mira', 'mira']), NameProblem.repeat);
  assert.equal(nameProblem(['Mira', 'Bo', 'Cora', 'MIRA']), NameProblem.repeat);
  assert.equal(nameProblem(['Mira', 'Mirá']), null, 'accents still distinguish names');
  assert.equal(nameProblem(['Mira', 'Bo', 'Cora', 'Dev']), null);
  assert.equal(nameProblem(['A', 'A']), NameProblem.length, 'length is checked first');
});

test('a stored group must already be in its accepted form', () => {
  assert.equal(isNameGroup(['Ada', 'Bo']), true);
  assert.equal(isNameGroup([' Ada', 'Bo']), false);
  assert.equal(isNameGroup(['Café', 'Bo']), false);
  assert.equal(isNameGroup(['Ada', 'ADA']), false);
});
