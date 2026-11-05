import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  advanceTournament,
  createTournament,
  playTournamentCard,
  startTournamentTurn,
} from './rules.ts';
import { encodeTournament, readTournamentDocument, TOURNAMENT_MAX_BYTES } from './format.ts';
import { finishTournamentTurn, TOURNAMENT_NAMES } from './tournament.fixture.ts';
import { isJsonObject } from '../saved-format.ts';
import { TournamentPhase } from './model.ts';

test('setup and each turn and match phase round trip as alphabetically ordered JSON', () => {
  const setup = { count: 4, names: ['Ada', '', '', ''] } as const;
  const draft = encodeTournament({ setup, tournament: null });
  assert.deepEqual(readTournamentDocument(draft).document, { setup, tournament: null });
  for (const count of [4, 8]) {
    let tournament = createTournament(TOURNAMENT_NAMES.slice(0, count), 91);
    for (;;) {
      const text = encodeTournament({ setup: null, tournament });
      const result = readTournamentDocument(text);
      assert.equal(result.error, '', `${count} ${tournament.currentMatch} ${tournament.phase}`);
      assert.ok(result.document);
      assert.equal(encodeTournament(result.document), text);
      checkKeyOrder(JSON.parse(text));
      if (tournament.phase === TournamentPhase.complete) break;
      if (tournament.phase === TournamentPhase.ready) tournament = startTournamentTurn(tournament);
      else if (tournament.phase === TournamentPhase.playing)
        tournament = finishTournamentTurn(tournament);
      else tournament = advanceTournament(tournament);
    }
  }
});

function checkKeyOrder(value: unknown): void {
  if (Array.isArray(value)) value.forEach(checkKeyOrder);
  else if (isJsonObject(value)) {
    assert.deepEqual(Object.keys(value), Object.keys(value).sort());
    Object.values(value).forEach(checkKeyOrder);
  }
}

test('active progress restores its selected cards and validates nested unknown fields', () => {
  const tournament = playTournamentCard(
    startTournamentTurn(createTournament(TOURNAMENT_NAMES.slice(0, 4), 1)),
    0,
  );
  const text = encodeTournament({ setup: null, tournament });
  const loaded = readTournamentDocument(text).document?.tournament;
  assert.ok(loaded);
  assert.deepEqual(loaded.game.selection, { kind: 'one', index: 0 });
  const value: unknown = JSON.parse(text);
  assert.ok(
    isJsonObject(value) &&
      isJsonObject(value.tournament) &&
      isJsonObject(value.tournament.game) &&
      isJsonObject(value.tournament.game.selection),
  );
  value.tournament.game.selection.extra = true;
  assert.equal(readTournamentDocument(JSON.stringify(value)).error, 'Unknown field: extra.');
});

test('malformed, inconsistent and oversized documents cannot replace a tournament', () => {
  const tournament = createTournament(TOURNAMENT_NAMES.slice(0, 4), 1);
  const base = encodeTournament({ setup: null, tournament });
  const cases = ['{', 'null', '[]', base.replace('"version": 1\n}', '"version": 2\n}')];
  for (const text of cases) assert.equal(readTournamentDocument(text).document, null);
  for (const change of [
    { currentMatch: 1 },
    { phase: 'complete' },
    { names: ['Ada', 'ada', 'Cora', 'Dev'] },
    { matches: tournament.matches.map((match) => ({ ...match, winner: 0 })) },
    { matches: tournament.matches.map((match) => ({ ...match, boardCode: 'np1-6-1' })) },
    { matches: tournament.matches.map((match) => ({ ...match, players: [0, 1] })) },
  ]) {
    const value: unknown = JSON.parse(base);
    assert.ok(isJsonObject(value) && isJsonObject(value.tournament));
    value.tournament = { ...value.tournament, ...change };
    assert.equal(readTournamentDocument(JSON.stringify(value)).document, null);
  }
  assert.equal(readTournamentDocument(' '.repeat(TOURNAMENT_MAX_BYTES + 1)).document, null);
});
