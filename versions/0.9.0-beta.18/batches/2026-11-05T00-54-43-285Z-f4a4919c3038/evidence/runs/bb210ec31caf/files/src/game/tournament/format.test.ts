import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGame, activateCard, advanceGame } from '../game.ts';
import { isJsonObject, parseJson } from '../saved-format.ts';
import {
  createTournament,
  nextTournamentTurn,
  recordTournamentResult,
  TournamentPhase,
} from './rules.ts';
import { encodeTournament, readTournament, TOURNAMENT_MAX_BYTES } from './format.ts';
import {
  completedGame,
  completedTournament,
  FOUR_NAMES,
  FOUR_CODES,
} from './tournament.fixture.ts';

test('setup, live progress and completed brackets round trip with precise time', () => {
  const tournament = {
    ...createTournament(FOUR_NAMES, FOUR_CODES),
    phase: TournamentPhase.playing,
  };
  let game = createGame(FOUR_CODES[0] ?? '');
  game = advanceGame(activateCard(game, 0), 0.25);
  const live = readTournament(encodeTournament(tournament, game));
  assert.deepEqual(live.archive, { tournament, game });
  assert.deepEqual(readTournament(encodeTournament(null, null)).archive, {
    tournament: null,
    game: null,
  });
  const done = completedTournament();
  assert.deepEqual(readTournament(encodeTournament(done.tournament, done.game)).archive, done);
});

test('new JSON sorts every object key and names its format', () => {
  const done = completedTournament();
  const text = encodeTournament(done.tournament, done.game);
  const keys: string[][] = [];
  JSON.parse(text, (_key, value: unknown) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value))
      keys.push(Object.keys(value));
    return value;
  });
  for (const group of keys) assert.deepEqual(group, [...group].sort());
  assert.match(text, /"format": "neon-pairs\/tournament"/);
});

test('every handoff and match result can be exported and restored', () => {
  let tournament = createTournament(FOUR_NAMES, FOUR_CODES);
  for (let turn = 0; turn < 6; turn += 1) {
    const code = tournament.matches[tournament.matchIndex]?.boardCode;
    assert.ok(code);
    const initial = createGame(code);
    assert.deepEqual(readTournament(encodeTournament(tournament, initial)).archive, {
      tournament,
      game: initial,
    });
    const game = completedGame(code);
    tournament = recordTournamentResult({ ...tournament, phase: TournamentPhase.playing }, game);
    assert.deepEqual(readTournament(encodeTournament(tournament, game)).archive, {
      tournament,
      game,
    });
    tournament = nextTournamentTurn(tournament);
  }
});

test('fractional mismatch intervals survive exchange without using snapshot rounding', () => {
  const tournament = {
    ...createTournament(FOUR_NAMES, FOUR_CODES),
    phase: TournamentPhase.playing,
  };
  let game = createGame(FOUR_CODES[0] ?? '');
  game = advanceGame(activateCard(activateCard(game, 0), 1), 0.25);
  assert.deepEqual(readTournament(encodeTournament(tournament, game)).archive, {
    tournament,
    game,
  });
});

test('imports reject unknown nested fields, impossible scores, altered winners and skipped turns', () => {
  const done = completedTournament();
  const value = parseJson(encodeTournament(done.tournament, done.game));
  assert.ok(isJsonObject(value) && isJsonObject(value.tournament) && isJsonObject(value.game));
  const tournament = value.tournament;
  const game = value.game;
  assert.ok(Array.isArray(tournament.matches) && isJsonObject(game.selection));
  const matches = tournament.matches;
  const first = matches[0];
  assert.ok(isJsonObject(first) && Array.isArray(first.results) && isJsonObject(first.results[0]));
  const results = first.results;
  const result = results[0];
  const withMatch = (index: number, patch: Record<string, unknown>) => ({
    ...value,
    tournament: {
      ...tournament,
      matches: matches.map((match, position) =>
        position === index && isJsonObject(match) ? { ...match, ...patch } : match,
      ),
    },
  });
  const read = (draft: unknown) => readTournament(JSON.stringify(draft));
  assert.equal(
    read(withMatch(0, { results: [{ ...result, extra: 1 }, results[1]] })).error,
    'Unknown field: extra.',
  );
  assert.equal(
    read({ ...value, game: { ...game, selection: { ...game.selection, extra: 1 } } }).error,
    'Unknown field: extra.',
  );
  for (const draft of [
    withMatch(0, { winner: 3 }),
    withMatch(0, { results: [{ ...result, moves: 1 }, results[1]] }),
    withMatch(0, { results: [null, results[1]] }),
    withMatch(1, { boardCode: first.boardCode }),
    { ...value, tournament: { ...tournament, players: [' Ada ', ...FOUR_NAMES.slice(1)] } },
    { ...value, version: 99 },
  ])
    assert.equal(read(draft).archive, null);
  for (const text of ['{', 'null', '[]', '{}', ' '.repeat(TOURNAMENT_MAX_BYTES + 1)])
    assert.equal(readTournament(text).archive, null);
});
