import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard } from '../game.ts';
import { isJsonObject, parseJson } from '../saved-format.ts';
import { decodeTournament, encodeTournament, TOURNAMENT_MAX_BYTES } from './format.ts';
import { finishTournamentTurn, TournamentPhase } from './rules.ts';
import { tournamentFixture, wonTournamentGame } from './tournament.fixture.ts';

test('setup, unfinished progress and finished results round trip as versioned alphabetical JSON', () => {
  const initial = tournamentFixture();
  const playing = {
    ...initial,
    phase: TournamentPhase.playing,
    game: activateCard(initial.game, 0),
  };
  const finished = finishTournamentTurn(playing, wonTournamentGame(initial.game));
  for (const state of [{ names: ['', '', '', ''] }, initial, playing, finished]) {
    const text = encodeTournament(state);
    assert.equal(decodeTournament(text).error, '');
    assert.equal(encodeTournament(decodeTournament(text).state ?? initial), text);
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
  }
});

test('unknown fields identify their name at the root, state, result and snapshot boundaries', () => {
  const initial = tournamentFixture();
  const value = parseJson(
    encodeTournament(
      finishTournamentTurn(
        { ...initial, phase: TournamentPhase.playing },
        wonTournamentGame(initial.game),
      ),
    ),
  );
  assert.ok(isJsonObject(value) && isJsonObject(value.state));
  const state = value.state;
  assert.ok(isJsonObject(state.snapshot) && Array.isArray(state.results));
  for (const target of [value, state, state.results[0], state.snapshot, state.snapshot.selection]) {
    assert.ok(isJsonObject(target));
    target.surprise = true;
    assert.equal(decodeTournament(JSON.stringify(value)).error, 'Unknown field: surprise.');
    delete target.surprise;
  }
});

test('imports reject malformed, oversized, duplicate deals, bad scores and inconsistent progress', () => {
  assert.equal(decodeTournament('{').state, null);
  assert.equal(decodeTournament(' '.repeat(TOURNAMENT_MAX_BYTES + 1)).state, null);
  const value = parseJson(encodeTournament(tournamentFixture()));
  assert.ok(isJsonObject(value) && isJsonObject(value.state));
  const state = value.state;
  for (const change of [
    { deals: ['np1-6-1', 'np1-6-1', 'np1-8-3'] },
    { names: ['Ada', 'ada', 'Cora', 'Dev'] },
    { phase: 'finished' },
    { phase: 'unknown' },
    { results: [{ moves: 1, elapsedMs: 0 }] },
    { results: [{ moves: 18, elapsedMs: -1 }] },
    { results: [{ moves: 18, elapsedMs: Number.MAX_SAFE_INTEGER }] },
    { deals: ['np1-4-1', 'np1-6-2', 'np1-8-3'] },
    { phase: 'finished', results: [{ moves: 18, elapsedMs: 0 }] },
  ])
    assert.equal(
      decodeTournament(JSON.stringify({ ...value, state: { ...state, ...change } })).state,
      null,
    );
});
