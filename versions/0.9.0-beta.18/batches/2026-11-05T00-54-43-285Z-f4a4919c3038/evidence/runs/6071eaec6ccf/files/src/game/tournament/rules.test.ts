import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import { tournamentDeals } from './deals.ts';
import { activateCard } from '../game.ts';
import { activateSession, initialSession } from '../session/session.ts';
import {
  matchPlayers,
  matchWinner,
  nameProblem,
  nextTurn,
  normalizedNames,
  recordTurn,
  roundFor,
  startTurn,
  TournamentPhase,
} from './rules.ts';
import {
  exampleTournament,
  finishTurn,
  finishedTournament,
  TOURNAMENT_NAMES,
} from './tournament.fixture.ts';

test('entry order fixes both opening brackets and stage dimensions', () => {
  const four = exampleTournament();
  assert.deepEqual(
    [0, 1].map((i) => matchPlayers(four, i).map((p) => four.names[p])),
    [
      ['Ada', 'Dev'],
      ['Bo', 'Cora'],
    ],
  );
  const eight = exampleTournament(8);
  assert.deepEqual(
    [0, 1, 2, 3].map((i) => matchPlayers(eight, i).map((p) => eight.names[p])),
    [
      ['Ada', 'Hal'],
      ['Dev', 'Emi'],
      ['Cora', 'Finn'],
      ['Bo', 'Gia'],
    ],
  );
  assert.deepEqual(
    [0, 4, 6].map((i) => roundFor(8, i)),
    [
      { name: 'Quarterfinal', size: 4 },
      { name: 'Semifinal', size: 6 },
      { name: 'Final', size: 8 },
    ],
  );
  assert.deepEqual(roundFor(4, 0), { name: 'Semifinal', size: 6 });
});

test('accepted names normalize spacing and NFC, count code points and reject group repeats', () => {
  assert.deepEqual(normalizedNames(['  Ada  Lovelace  ', 'Cafe\u0301']), ['Ada Lovelace', 'Café']);
  for (const name of ['', 'A', 'x'.repeat(21), '😀'.repeat(21)])
    assert.equal(nameProblem([name, 'Bo', 'Cora', 'Dev']), 'Use 2 to 20 characters.');
  for (const name of ['Al', 'A😀', '😀'.repeat(20), '  Ada   Lovelace '])
    assert.equal(nameProblem([name, 'Bo', 'Cora', 'Dev']), '');
  assert.equal(nameProblem(['Ada', 'Bo', 'Cora', '  ADA  ']), 'Each name must be different.');
  assert.equal(nameProblem(['Café', 'Cafe\u0301', 'Bo', 'Dev']), 'Each name must be different.');
});

test('handoffs require an explicit start and repeat the match deal from an empty board', () => {
  const ready = exampleTournament();
  assert.equal(nextTurn(ready), ready);
  const playing = startTurn(ready);
  assert.ok(playing.game);
  assert.equal(recordTurn(ready, playing.game), ready);
  const progress = recordTurn(playing, activateCard(playing.game, 0));
  assert.equal(progress.matches[0]?.results.length, 0);
  const result = finishTurn(ready);
  assert.equal(result.phase, TournamentPhase.result);
  assert.equal(result.matches[0]?.results.length, 1);
  const second = startTurn(nextTurn(result));
  assert.equal(second.game?.boardCode, playing.game.boardCode);
  assert.equal(second.game?.moves, 0);
  assert.equal(second.game?.elapsedMs, 0);
  assert.deepEqual(second.game?.matched, []);
  assert.deepEqual(second.game?.selection, { kind: 'closed' });
  const matchEnd = finishTurn(nextTurn(result));
  assert.equal(matchWinner(matchEnd, 0), 0);
  assert.equal(nextTurn(matchEnd).matchIndex, 1);
});

test('moves settle matches before precise active time and entry seed breaks exact ties', () => {
  const base = exampleTournament();
  const compare = (movesA: number, timeA: number, movesB: number, timeB: number) =>
    matchWinner(
      {
        ...base,
        matches: base.matches.map((match, index) =>
          index
            ? match
            : {
                ...match,
                results: [
                  { moves: movesA, elapsedMs: timeA },
                  { moves: movesB, elapsedMs: timeB },
                ],
              },
        ),
      },
      0,
    );
  assert.equal(compare(18, 10_000, 19, 1), 0);
  assert.equal(compare(19, 1, 18, 10_000), 3);
  assert.equal(compare(18, 100.75, 18, 100.25), 3);
  assert.equal(compare(18, 100.25, 18, 100.75), 0);
  assert.equal(compare(18, 100.25, 18, 100.25), 0);
});

test('both bracket sizes advance winners to a single champion and stop there', () => {
  for (const count of [4, 8]) {
    const state = finishedTournament(count);
    assert.equal(state.matches.length, count - 1);
    assert.ok(state.matches.every((match) => match.results.length === 2));
    assert.equal(state.phase, TournamentPhase.complete);
    assert.equal(matchWinner(state, count - 2), 0);
    assert.equal(state.names[0], TOURNAMENT_NAMES[0]);
    assert.equal(nextTurn(state), state);
    assert.equal(startTurn(state), state);
  }
});

test('tournament completions preserve solo size and best scores by identity', () => {
  const preferences = { size: 10, bestMoves: { '4': 12 } };
  let session = initialSession('np1-4-1', preferences);
  const deck = session.game.deck;
  for (let face = 0; face < 8; face++) {
    session = activateSession(session, deck.indexOf(face), true);
    session = activateSession(session, deck.lastIndexOf(face), true);
  }
  assert.equal(session.preferences, preferences);
  assert.equal(session.game.moves, 8);
});

test('a repeated entropy draw still allocates a unique full deal for every match', () => {
  vi.stubGlobal('crypto', { getRandomValues: (buffer: Uint32Array) => buffer.fill(0) });
  try {
    assert.deepEqual(tournamentDeals(8), [
      'np1-4-1',
      'np1-4-2',
      'np1-4-3',
      'np1-4-4',
      'np1-6-1',
      'np1-6-2',
      'np1-8-1',
    ]);
  } finally {
    vi.unstubAllGlobals();
  }
});
