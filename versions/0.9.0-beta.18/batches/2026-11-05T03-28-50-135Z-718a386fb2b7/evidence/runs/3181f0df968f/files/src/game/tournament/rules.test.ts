import { expect, test } from 'vitest';
import {
  finishTurn,
  nameError,
  newTournament,
  normalizeName,
  roundName,
  roundSize,
  winnerOf,
} from './rules.ts';
import { exportTournament, importTournament } from './format.ts';

const names = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
const codes = ['np1-4-1', 'np1-4-2', 'np1-4-3', 'np1-4-4', 'np1-6-5', 'np1-6-6', 'np1-8-7'];

test('uses entry-order pairings and the specified round sizes', () => {
  const event = newTournament(names, codes);
  expect(event.matches.slice(0, 4).map((match) => match.players)).toEqual([
    [0, 7],
    [3, 4],
    [2, 5],
    [1, 6],
  ]);
  expect(codes.map((_, i) => [roundName(8, i), roundSize(8, i)])).toEqual([
    ['Quarterfinal', 4],
    ['Quarterfinal', 4],
    ['Quarterfinal', 4],
    ['Quarterfinal', 4],
    ['Semifinal', 6],
    ['Semifinal', 6],
    ['Final', 8],
  ]);
  expect(
    newTournament(names.slice(0, 4), ['np1-6-1', 'np1-6-2', 'np1-8-3']).matches.map(
      (match) => match.players,
    ),
  ).toEqual([
    [0, 3],
    [1, 2],
    [null, null],
  ]);
});

test('compares moves, precise active time, then seed and advances the winner', () => {
  let event = newTournament(names, codes);
  event = finishTurn(event, { moves: 9, elapsedMs: 900 });
  event = finishTurn(event, { moves: 10, elapsedMs: 100 });
  expect(event.matches[0]?.winner).toBe(0);
  expect(event.matches[4]?.players).toEqual([0, null]);
  const match = event.matches[0]!;
  expect(
    winnerOf({
      ...match,
      results: [
        { moves: 9, elapsedMs: 900.2 },
        { moves: 9, elapsedMs: 900.1 },
      ],
    }),
  ).toBe(7);
  expect(
    winnerOf({
      ...match,
      results: [
        { moves: 9, elapsedMs: 900 },
        { moves: 9, elapsedMs: 900 },
      ],
    }),
  ).toBe(0);
});

test('normalizes names and enforces code-point length and uniqueness', () => {
  expect(normalizeName('  Cafe\u0301   😀  ')).toBe('Café 😀');
  expect(nameError(['A😀', 'Bo'])).toBe('');
  expect(nameError(['A', 'Bo'])).toBe('Use 2 to 20 characters.');
  expect(nameError(['Ada', 'ada'])).toBe('Each name must be different.');
});

test('round trips state and rejects inconsistent or unknown imported fields', () => {
  let event = newTournament(names, codes);
  event = finishTurn(event, { moves: 9, elapsedMs: 1200.5 });
  event = finishTurn(event, { moves: 8, elapsedMs: 1500 });
  expect(importTournament(exportTournament(event)).tournament).toEqual(event);
  const corrupt = JSON.parse(exportTournament(event));
  corrupt.tournament.matches[0].winner = 0;
  expect(importTournament(JSON.stringify(corrupt)).error).toBe('Invalid tournament.');
  corrupt.tournament.matches[0].extra = true;
  expect(importTournament(JSON.stringify(corrupt)).error).toBe('Unknown field: extra.');
});

test('advances an eight-player bracket through every round', () => {
  let event = newTournament(names, codes);
  const opponents = [
    [0, 7],
    [3, 4],
    [2, 5],
    [1, 6],
    [0, 3],
    [2, 1],
    [0, 2],
  ];
  for (let index = 0; index < opponents.length; index++) {
    event = { ...event, current: index };
    expect(event.matches[index]?.players).toEqual(opponents[index]);
    const moves = roundSize(8, index) ** 2 / 2;
    event = finishTurn(event, { moves, elapsedMs: 1000 });
    event = finishTurn(event, { moves: moves + 1, elapsedMs: 500 });
  }
  expect(event.matches[6]?.winner).toBe(0);
});
