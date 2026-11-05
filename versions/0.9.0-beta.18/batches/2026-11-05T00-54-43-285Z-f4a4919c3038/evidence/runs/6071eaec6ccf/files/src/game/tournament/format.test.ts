import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard } from '../game.ts';
import { isJsonObject, parseJson } from '../saved-format.ts';
import {
  decodeTournament,
  encodeTournament,
  TOURNAMENT_FORMAT,
  TOURNAMENT_VERSION,
  TOURNAMENT_MAX_BYTES,
} from './format.ts';
import { nextTurn, startTurn, tournamentDraft } from './rules.ts';
import { exampleTournament, finishTurn, finishedTournament } from './tournament.fixture.ts';

test('setup, handoffs, active progress and completion round trip in a discriminated sorted format', () => {
  const ready = exampleTournament();
  const started = startTurn(ready);
  assert.ok(started.game);
  const active = { ...started, game: activateCard(started.game, 0) };
  for (const state of [
    tournamentDraft(),
    ready,
    started,
    active,
    finishTurn(ready),
    nextTurn(finishTurn(ready)),
    finishedTournament(),
    finishedTournament(8),
  ]) {
    const text = encodeTournament(state);
    assert.deepEqual(decodeTournament(text).state, state);
    const value = parseJson(text);
    assert.ok(isJsonObject(value));
    assert.equal(value.format, TOURNAMENT_FORMAT);
    assert.equal(value.version, TOURNAMENT_VERSION);
    checkSorted(value);
  }
});

function checkSorted(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(checkSorted);
    return;
  }
  if (!isJsonObject(value)) return;
  assert.deepEqual(Object.keys(value), Object.keys(value).sort());
  Object.values(value).forEach(checkSorted);
}

test('unknown fields at each nested boundary report their names without accepting the draft', () => {
  const started = startTurn(exampleTournament());
  assert.ok(started.game);
  const value = parseJson(encodeTournament(started));
  assert.ok(isJsonObject(value) && isJsonObject(value.game));
  const attempts = [
    { ...value, surprise: true },
    { ...value, matches: [{ ...started.matches[0], surprise: true }, ...started.matches.slice(1)] },
    {
      ...value,
      matches: [
        { ...started.matches[0], results: [{ moves: 18, elapsedMs: 0, surprise: true }] },
        ...started.matches.slice(1),
      ],
    },
    { ...value, game: { ...value.game, surprise: true } },
    { ...value, game: { ...value.game, selection: { kind: 'closed', surprise: true } } },
  ];
  for (const attempt of attempts) {
    const decoded = decodeTournament(JSON.stringify(attempt));
    assert.equal(decoded.state, null);
    assert.equal(decoded.problem, 'Unknown field: surprise.');
  }
  assert.equal(
    decodeTournament(JSON.stringify({ ...value, '': true })).problem,
    'Unknown field: .',
  );
});

test('malformed shapes, invalid progress, repeated deals and impossible results are rejected', () => {
  const state = exampleTournament();
  const value = parseJson(encodeTournament(state));
  assert.ok(isJsonObject(value));
  const attempts: unknown[] = [
    null,
    [],
    { ...value, version: 2 },
    { ...value, format: 'other' },
    { ...value, names: ['Ada', 'ADA', 'Cora', 'Dev'] },
    { ...value, phase: 'other' },
    { ...value, matchIndex: 2 },
    { ...value, game: {} },
    { ...value, matches: [state.matches[0], state.matches[0], state.matches[2]] },
    { ...value, matches: [{ boardCode: 'np1-4-1', results: [] }, ...state.matches.slice(1)] },
    { ...value, phase: 'result' },
    { ...value, phase: 'complete' },
    {
      ...value,
      matches: [
        { ...state.matches[0], results: [{ moves: 1, elapsedMs: 0 }] },
        ...state.matches.slice(1),
      ],
    },
    {
      ...value,
      matches: [
        { ...state.matches[0], results: [{ moves: 18, elapsedMs: -1 }] },
        ...state.matches.slice(1),
      ],
    },
  ];
  for (const attempt of attempts)
    assert.equal(decodeTournament(JSON.stringify(attempt)).state, null);
  assert.equal(decodeTournament('{').state, null);
  assert.equal(decodeTournament(' '.repeat(TOURNAMENT_MAX_BYTES + 1)).state, null);
});
