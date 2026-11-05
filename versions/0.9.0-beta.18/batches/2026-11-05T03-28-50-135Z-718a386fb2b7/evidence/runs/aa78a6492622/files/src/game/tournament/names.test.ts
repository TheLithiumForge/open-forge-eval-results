import assert from 'node:assert/strict';
import { test } from 'vitest';
import { normalizeTournamentName, validateTournamentNames, TournamentNameError } from './names.ts';

test('accepted names trim, collapse spaces and normalize canonically', () => {
  assert.equal(normalizeTournamentName('  Cafe\u0301   Lovelace  '), 'Café Lovelace');
});

test('name length uses inclusive Unicode code-point bounds', () => {
  assert.equal(validateTournamentNames(['Al']), null);
  assert.equal(validateTournamentNames(['A😀']), null);
  assert.equal(validateTournamentNames(['A']), TournamentNameError.length);
  assert.equal(validateTournamentNames(['x'.repeat(21)]), TournamentNameError.length);
});

test('duplicate names are rejected without changing their display case', () => {
  assert.equal(validateTournamentNames(['Mira', 'mira']), TournamentNameError.duplicate);
  assert.equal(validateTournamentNames(['Mira', 'Milo']), null);
});
