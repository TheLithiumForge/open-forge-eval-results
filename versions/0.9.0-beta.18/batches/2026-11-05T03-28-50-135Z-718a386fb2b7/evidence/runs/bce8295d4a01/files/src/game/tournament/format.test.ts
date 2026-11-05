import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import { createGame } from '../game.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { isJsonObject, parseJson } from '../saved-format.ts';
import { encodeTournament, decodeTournament } from './format.ts';
import { beginTournamentTurn, createTournament, roundPlan, stageSize } from './rules.ts';

const CREATED = '2026-11-05T12:00:00.000Z';

function initialTournament() {
  const players = ['Ada', 'Bo', 'Cora', 'Dev'].map((name, index) => ({ name, seed: index + 1 }));
  const codes = roundPlan(4).map((round, index) => boardCode(stageSize(round), index + 1));
  const tournament = createTournament(players, codes, CREATED);
  assert.ok(tournament);
  return tournament;
}

test('tournament JSON is sorted, readable and round-trips a ready bracket', () => {
  const text = encodeTournament(initialTournament(), null);
  const decoded = decodeTournament(text);
  assert.equal(decoded.ok, true);
  if (decoded.ok) assert.deepEqual(decoded.tournament, initialTournament());
  const parsed = parseJson(text);
  assert.ok(isJsonObject(parsed));
  assert.deepEqual(Object.keys(parsed), ['format', 'tournament', 'version']);
  assert.match(text, /"format": "neon-pairs\/tournament"/);
});

test('tournament JSON carries a current game snapshot while a turn is in progress', () => {
  const tournament = initialTournament();
  const started = beginTournamentTurn(tournament);
  const code = started.matches[0]?.boardCode;
  assert.ok(code);
  const text = encodeTournament(started, encodeSnapshot(createGame(code)));
  const decoded = decodeTournament(text);
  assert.equal(decoded.ok, true);
  if (decoded.ok) assert.equal(decoded.tournament.phase, 'playing');
});

test('tournament JSON rejects unknown fields and unsupported versions', () => {
  const parsed = parseJson(encodeTournament(initialTournament(), null));
  assert.ok(isJsonObject(parsed));
  const withUnknown = JSON.stringify({ ...parsed, extra: true });
  assert.deepEqual(decodeTournament(withUnknown), {
    ok: false,
    message: 'Unknown field: extra.',
  });
  assert.equal(decodeTournament('{').ok, false);
  const unsupported = JSON.stringify({ ...parsed, version: 2 });
  assert.deepEqual(decodeTournament(unsupported), { ok: false, message: 'Invalid tournament.' });
});
