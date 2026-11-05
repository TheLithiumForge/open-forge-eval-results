import assert from 'node:assert/strict';
import { test } from 'vitest';
import { activateCard, createGame } from '../game.ts';
import { decodeTournament, encodeTournament, TOURNAMENT_MAX_BYTES } from './format.ts';
import { createTournament, startTurn } from './rules.ts';
import { isJsonObject } from '../saved-format.ts';

const state = createTournament(['Ada', 'Bo', 'Cora', 'Dev'], ['np1-6-1', 'np1-6-2', 'np1-8-3']);

function alphabetical(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(alphabetical);
    return;
  }
  if (!isJsonObject(value)) return;
  assert.deepEqual(Object.keys(value), Object.keys(value).sort());
  Object.values(value).forEach(alphabetical);
}

test('tournament JSON round trips setup, handoffs and active progress with alphabetical keys', () => {
  const playing = startTurn(state);
  const game = activateCard(createGame('np1-6-1'), 0);
  for (const entry of [null, state, { ...playing, game }, { ...state, game }]) {
    const text = encodeTournament(entry);
    alphabetical(JSON.parse(text));
    assert.deepEqual(decodeTournament(text).state, entry);
  }
});

test('unknown fields are identified at each tournament nesting level', () => {
  const game = activateCard(createGame('np1-6-1'), 0);
  const json: unknown = JSON.parse(encodeTournament({ ...startTurn(state), game }));
  assert.ok(isJsonObject(json) && isJsonObject(json.tournament));
  const tournament = json.tournament;
  const gameValue = tournament.game;
  assert.ok(isJsonObject(gameValue) && isJsonObject(gameValue.selection));
  assert.ok(Array.isArray(tournament.matches) && isJsonObject(tournament.matches[0]));
  for (const value of [json, tournament, tournament.matches[0], gameValue, gameValue.selection]) {
    value.surprise = 1;
    assert.equal(decodeTournament(JSON.stringify(json)).error, 'Unknown field: surprise.');
    delete value.surprise;
  }
});

test('invalid tournament versions, brackets, scores and phase relationships reject the whole import', () => {
  const text = encodeTournament(state);
  for (const draft of [
    '{',
    'null',
    '[]',
    ' '.repeat(TOURNAMENT_MAX_BYTES + 1),
    text.replace('"version": 1', '"version": 2'),
    text.replace('np1-6-2', 'np1-6-1'),
    text.replace('np1-6-1', 'np1-4-1'),
    text.replace('"currentMatch": 0', '"currentMatch": 1'),
    text.replace('"ready"', '"complete"'),
    text.replace('"Ada"', '"Bo"'),
    text.replace('"results": []', '"results": [{"moves": 1, "elapsedMs": 0}]'),
    text.replace('"results": []', '"results": [{"moves": 18, "elapsedMs": -1}]'),
  ])
    assert.equal(decodeTournament(draft).error, 'Invalid tournament.');
});
