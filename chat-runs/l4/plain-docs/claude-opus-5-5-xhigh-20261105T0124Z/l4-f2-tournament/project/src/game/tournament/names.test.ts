import assert from 'node:assert/strict';
import { test } from 'vitest';
import { acceptedName, NameProblem, nameProblem } from './names.ts';

test('names are trimmed, single spaced and composed, keeping punctuation and case', () => {
  assert.equal(acceptedName('  Mira  '), 'Mira');
  assert.equal(acceptedName('Ada \t  Lovelace'), 'Ada Lovelace');
  assert.equal(acceptedName('Café'), 'Café');
  assert.equal(acceptedName("O'Neil"), "O'Neil");
  assert.equal(acceptedName(acceptedName('  Jean   Luc ')), 'Jean Luc');
});

test('accepted names need 2 to 20 code points', () => {
  const others = ['Bo', 'Cora', 'Dev'];
  const check = (name: string) => nameProblem([name, ...others]);
  assert.equal(check(''), NameProblem.length);
  assert.equal(check('A'), NameProblem.length);
  assert.equal(check('Al'), null);
  assert.equal(check('A\u{1F600}'), null);
  assert.equal(check('a'.repeat(20)), null);
  assert.equal(check('a'.repeat(21)), NameProblem.length);
  assert.equal(check('\u{1F600}'.repeat(20)), null, 'forty code units are twenty code points');
});

test('a repeated name anywhere in the group fails without regard to case', () => {
  assert.equal(nameProblem(['Mira', 'Bo', 'Cora', 'Mira']), NameProblem.repeat);
  assert.equal(nameProblem(['Mira', 'Bo', 'mira', 'Dev']), NameProblem.repeat);
  assert.equal(nameProblem(['Mira', 'MIRA', 'Cora', 'Dev']), NameProblem.repeat);
  assert.equal(nameProblem(['Straße', 'STRASSE', 'Cora', 'Dev']), NameProblem.repeat);
  assert.equal(nameProblem(['Mira', 'Miro', 'Cora', 'Dev']), null);
  assert.equal(
    nameProblem(['A', 'Bo', 'Bo', 'Dev']),
    NameProblem.length,
    'length is checked first',
  );
});
