import assert from 'node:assert/strict';
import { test } from 'vitest';
import { checkNames, countCharacters, isNameLength, NameError, normalizeName } from './names.ts';

test('a name is trimmed, collapsed and composed', () => {
  assert.equal(normalizeName('  Mira  '), 'Mira');
  assert.equal(normalizeName('Ada   Lovelace'), 'Ada Lovelace');
  assert.equal(normalizeName('Jean Luc'), 'Jean Luc');
  assert.equal(normalizeName("O'Neil"), "O'Neil");
  assert.equal(normalizeName('Café'), 'Café');
  assert.equal(normalizeName(normalizeName('  A \t b ')), 'A b');
});

test('length counts code points after normalizing', () => {
  assert.equal(countCharacters('A\u{1F600}'), 2);
  assert.equal('A\u{1F600}'.length, 3);
  assert.deepEqual(
    ['', 'A', 'Al', 'A\u{1F600}', 'a'.repeat(20), 'a'.repeat(21), '\u{1F600}'.repeat(20)].map(
      isNameLength,
    ),
    [false, false, true, true, true, false, true],
  );
});

test('a name that is too short or too long blocks with its message', () => {
  const result = checkNames(['Ada', 'B', 'Cora', 'Dev']);
  assert.deepEqual(result, { ok: false, error: 'Use 2 to 20 characters.', fields: [1] });
  assert.equal(NameError.length, 'Use 2 to 20 characters.');
  const spaced = checkNames(['Ada', ' B ', 'Cora', 'x'.repeat(21)]);
  assert.deepEqual(spaced, { ok: false, error: NameError.length, fields: [1, 3] });
});

test('the length is checked on the accepted name, not on the draft', () => {
  const result = checkNames(['  Ada  ', 'Bo', 'Cora', 'Dev']);
  assert.deepEqual(result, { ok: true, names: ['Ada', 'Bo', 'Cora', 'Dev'] });
});

test('a repeat in the group blocks whatever the case or spacing', () => {
  assert.deepEqual(checkNames(['Mira', 'Bo', 'mira', 'Dev']), {
    ok: false,
    error: 'Each name must be different.',
    fields: [0, 2],
  });
  assert.deepEqual(checkNames(['Mira', 'Bo', 'Dev', ' MIRA ']), {
    ok: false,
    error: NameError.duplicate,
    fields: [0, 3],
  });
  assert.equal(checkNames(['Ada  Lovelace', 'Bo', 'Dev', 'ada lovelace']).ok, false);
});

test('a repeat is found when it is not next to the first entry', () => {
  const result = checkNames(['Mira', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'MIRA']);
  assert.deepEqual(result, { ok: false, error: NameError.duplicate, fields: [0, 7] });
});

test('different names keep the spelling that was entered', () => {
  const result = checkNames(['Mira', 'mIRa2', 'Cora', 'Dev']);
  assert.deepEqual(result, { ok: true, names: ['Mira', 'mIRa2', 'Cora', 'Dev'] });
});
