import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, advanceGame } from '../game.ts';
import { isJsonObject } from '../saved-format.ts';
import { decodeTournament, encodeTournament, TOURNAMENT_MAX_BYTES } from './format.ts';
import { tournamentSetup, startTournamentTurn } from './rules.ts';
import {
  exampleTournament,
  finishExampleTurn,
  finishedExampleTournament,
} from './tournament.fixture.ts';

test('setup, active, handoff and completed tournaments round trip in alphabetical JSON', () => {
  const initial = exampleTournament();
  assert.ok(initial.game);
  let game = activateCard(initial.game, 0);
  game = advanceGame(game, 10.25);
  const playing = { ...startTournamentTurn(initial), game };
  const other = game.deck.findIndex((face) => face !== game.deck[0]);
  const mismatch = { ...playing, game: advanceGame(activateCard(game, other), 0.25) };
  const states = [
    tournamentSetup(),
    initial,
    playing,
    mismatch,
    finishExampleTurn(initial),
    finishedExampleTournament(8),
  ];
  for (const state of states) {
    const text = encodeTournament(state);
    const decoded = decodeTournament(text);
    assert.ok('state' in decoded);
    assert.deepEqual(decoded.state, state);
    JSON.parse(text, (_key, value: unknown) => {
      if (isJsonObject(value)) assert.deepEqual(Object.keys(value), Object.keys(value).sort());
      return value;
    });
  }
});

test('tournament imports reject impossible counters, future results and false start times', () => {
  const baseline: unknown = JSON.parse(encodeTournament(exampleTournament()));
  assert.ok(isJsonObject(baseline) && isJsonObject(baseline.state));
  const state = baseline.state;
  assert.ok(isJsonObject(state.game) && Array.isArray(state.matches));
  const matches = state.matches;
  for (const [moves, elapsedMs] of [
    [17, 0],
    [18.5, 0],
    [1_000_000, 0],
    [18, -1],
    [18, 360_000_000],
  ]) {
    const first = matches[0];
    assert.ok(isJsonObject(first));
    const altered = [{ ...first, results: [{ moves, elapsedMs }] }, ...matches.slice(1)];
    assert.ok(
      'error' in
        decodeTournament(JSON.stringify({ ...baseline, state: { ...state, matches: altered } })),
    );
  }
  const future = matches[1];
  assert.ok(isJsonObject(future));
  assert.ok(
    'error' in
      decodeTournament(
        JSON.stringify({
          ...baseline,
          state: {
            ...state,
            matches: [
              matches[0],
              { ...future, results: [{ moves: 18, elapsedMs: 0 }] },
              matches[2],
            ],
          },
        }),
      ),
  );
  assert.ok(
    'error' in
      decodeTournament(
        JSON.stringify({
          ...baseline,
          state: { ...state, game: { ...state.game, elapsedMs: 0.5 } },
        }),
      ),
  );
});

test('unknown fields are identified at every tournament object boundary', () => {
  const baseline: unknown = JSON.parse(encodeTournament(finishedExampleTournament()));
  assert.ok(isJsonObject(baseline) && isJsonObject(baseline.state));
  const state = baseline.state;
  assert.ok(Array.isArray(state.matches) && isJsonObject(state.matches[0]));
  const match = state.matches[0];
  assert.ok(Array.isArray(match.results) && isJsonObject(match.results[0]));
  assert.ok(isJsonObject(state.game) && isJsonObject(state.game.selection));
  for (const object of [
    baseline,
    state,
    match,
    match.results[0],
    state.game,
    state.game.selection,
  ]) {
    object.surprise = true;
    assert.deepEqual(decodeTournament(JSON.stringify(baseline)), {
      error: 'Unknown field: surprise.',
    });
    delete object.surprise;
  }
});

test('malformed or inconsistent tournament data is rejected before installation', () => {
  const source: unknown = JSON.parse(encodeTournament(exampleTournament()));
  assert.ok(isJsonObject(source) && isJsonObject(source.state));
  const state = source.state;
  const invalid = [
    '{',
    'null',
    '[]',
    encodeTournament(exampleTournament()) + ' '.repeat(TOURNAMENT_MAX_BYTES),
    JSON.stringify({ ...source, version: 2 }),
    JSON.stringify({ ...source, state: { ...state, names: ['Ada', 'Bo', 'Cora', 'ada'] } }),
    JSON.stringify({ ...source, state: { ...state, phase: 'complete' } }),
    JSON.stringify({ ...source, state: { ...state, phase: 'matchEnd' } }),
    JSON.stringify({ ...source, state: { ...state, matches: [] } }),
    JSON.stringify({ ...source, state: { ...state, game: null } }),
  ];
  for (const text of invalid) assert.ok('error' in decodeTournament(text));
});
