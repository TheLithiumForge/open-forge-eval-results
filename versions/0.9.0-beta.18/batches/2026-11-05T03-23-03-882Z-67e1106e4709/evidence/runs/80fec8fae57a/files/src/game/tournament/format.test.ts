import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame } from '../game.ts';
import { isJsonObject, parseJson } from '../saved-format.ts';
import { encodeTournament, decodeTournament } from './format.ts';
import { startTournamentTurn, updateTournamentGame } from './rules.ts';
import {
  completedTournament,
  finishTournamentTurn,
  tournamentFixture,
} from './tournament.fixture.ts';
import { nextTournamentTurn } from './rules.ts';
import { TournamentPhase } from './model.ts';

test('exports identify the format and alphabetize keys recursively', () => {
  const text = encodeTournament({ setup: null, tournament: completedTournament() });
  const value = parseJson(text);
  assert.ok(isJsonObject(value));
  assert.equal(value.format, 'neon-pairs/tournament');
  assert.equal(value.version, 1);
  function check(value: unknown): void {
    if (Array.isArray(value)) value.forEach(check);
    else if (isJsonObject(value)) {
      assert.deepEqual(Object.keys(value), Object.keys(value).sort());
      Object.values(value).forEach(check);
    }
  }
  check(value);
  assert.equal(decodeTournament(text).document?.tournament?.phase, TournamentPhase.complete);
});

test('setup, handoffs and exact completed results survive exchange', () => {
  const setup = { setup: [' Ada ', '', 'Cora', 'Dee'], tournament: null };
  assert.deepEqual(decodeTournament(encodeTournament(setup)).document?.setup, [
    'Ada',
    '',
    'Cora',
    'Dee',
  ]);
  const first = finishTournamentTurn(tournamentFixture(), 3, 1234.567);
  const restored = decodeTournament(encodeTournament({ setup: null, tournament: first })).document
    ?.tournament;
  assert.equal(restored?.matches[0]?.results[0]?.elapsedMs, 1234.567);
  assert.equal(restored?.game.elapsedMs, 1234);
  assert.equal(restored?.phase, TournamentPhase.turnFinished);
  assert.equal(restored && nextTournamentTurn(restored).turn, 1);
});

test('a playing export preserves a pending mismatch and its remaining active interval', () => {
  let state = startTournamentTurn(tournamentFixture(8));
  const game = advanceGame(activateCard(activateCard(state.game, 0), 1), 200.25);
  state = updateTournamentGame(state, game);
  const restored = decodeTournament(encodeTournament({ setup: null, tournament: state })).document
    ?.tournament;
  assert.equal(restored?.game.moves, 1);
  assert.equal(restored?.game.elapsedMs, 200);
  assert.deepEqual(restored?.game.selection, {
    kind: 'mismatch',
    first: 0,
    second: 1,
    remainingMs: 600,
  });
});

test('unknown fields at every object boundary identify the offending key', () => {
  const original = parseJson(encodeTournament({ setup: null, tournament: completedTournament() }));
  assert.ok(isJsonObject(original) && isJsonObject(original.tournament));
  const state = original.tournament;
  assert.ok(isJsonObject(state.game) && Array.isArray(state.matches));
  const match = state.matches[0];
  assert.ok(isJsonObject(match) && Array.isArray(match.results));
  const result = match.results[0];
  assert.ok(isJsonObject(result) && isJsonObject(state.game.selection));
  for (const object of [original, state, state.game, state.game.selection, match, result]) {
    object.extra = true;
    assert.equal(decodeTournament(JSON.stringify(original)).error, 'Unknown field: extra.');
    delete object.extra;
  }
});

test('imports reject invalid versions, repeated deals, impossible scores and out-of-order results', () => {
  const text = encodeTournament({ setup: null, tournament: completedTournament() });
  for (const change of [
    (root: Record<string, unknown>) => {
      root.version = 2;
    },
    (root: Record<string, unknown>) => {
      root.format = 'other';
    },
    (root: Record<string, unknown>) => {
      assert.ok(isJsonObject(root.tournament));
      root.tournament.matchIndex = 0;
    },
    (root: Record<string, unknown>) => {
      assert.ok(isJsonObject(root.tournament));
      root.tournament.players = ['Ada', 'ada', 'Cora', 'Dee'];
    },
    (root: Record<string, unknown>) => {
      assert.ok(isJsonObject(root.tournament) && Array.isArray(root.tournament.matches));
      const first = root.tournament.matches[0];
      const second = root.tournament.matches[1];
      assert.ok(isJsonObject(first) && isJsonObject(second));
      second.boardCode = first.boardCode;
    },
    (root: Record<string, unknown>) => {
      assert.ok(isJsonObject(root.tournament) && isJsonObject(root.tournament.game));
      root.tournament.game.selection = { kind: '__proto__' };
    },
    (root: Record<string, unknown>) => {
      assert.ok(isJsonObject(root.tournament) && Array.isArray(root.tournament.matches));
      const match = root.tournament.matches[0];
      assert.ok(isJsonObject(match));
      match.results = [{ moves: 1, elapsedMs: 0 }, null];
    },
  ]) {
    const root = parseJson(text);
    assert.ok(isJsonObject(root));
    change(root);
    assert.equal(decodeTournament(JSON.stringify(root)).document, null);
  }
  for (const invalid of ['{', 'null', '[]', ' '.repeat(262_145)])
    assert.equal(decodeTournament(invalid).document, null);
});
