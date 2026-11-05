import { describe, expect, it } from 'vitest';
import { decodeTournament, encodeTournament } from './format.ts';
import {
  nameError,
  nextMatch,
  normalizeName,
  playersFor,
  recordResult,
  roundSize,
  winner,
} from './tournament.ts';
import type { Match, TournamentState } from './tournament.ts';

describe('tournament bracket', () => {
  it('uses the specified opening order and board sizes', () => {
    expect(Array.from({ length: 4 }, (_, i) => playersFor(8, [], i))).toEqual([
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
    ]);
    expect(Array.from({ length: 2 }, (_, i) => playersFor(4, [], i))).toEqual([
      [0, 3],
      [1, 2],
    ]);
    expect(Array.from({ length: 7 }, (_, i) => roundSize(8, i))).toEqual([4, 4, 4, 4, 6, 6, 8]);
  });
  it('orders moves, precise active time, then seed', () => {
    const match: Match = {
      boardCode: 'np1-4-1',
      players: [3, 0],
      results: [
        { moves: 9, elapsedMs: 20 },
        { moves: 10, elapsedMs: 1 },
      ],
    };
    expect(winner(match)).toBe(3);
    expect(
      winner({
        ...match,
        results: [
          { moves: 9, elapsedMs: 20.1 },
          { moves: 9, elapsedMs: 20.2 },
        ],
      }),
    ).toBe(3);
    expect(
      winner({
        ...match,
        results: [
          { moves: 9, elapsedMs: 20 },
          { moves: 9, elapsedMs: 20 },
        ],
      }),
    ).toBe(0);
  });
  it('advances eight entrants through each round in bracket order', () => {
    let event: TournamentState = {
      names: ['A1', 'B2', 'C3', 'D4', 'E5', 'F6', 'G7', 'H8'],
      matches: [],
      phase: 'ready',
    };
    const pairs = [
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
      [0, 3],
      [2, 1],
      [0, 1],
    ];
    const sizes = [4, 4, 4, 4, 6, 6, 8];
    for (let i = 0; i < 7; i++) {
      const size = sizes[i]!;
      event = nextMatch(event, `np1-${size}-${i + 1}`);
      expect(event.matches[i]?.players).toEqual(pairs[i]);
      const result = { moves: (size * size) / 2, elapsedMs: 100 };
      event = recordResult(event, result);
      event = recordResult(event, result);
    }
    expect(winner(event.matches[6]!)).toBe(0);
  });
  it('normalizes names and validates code points and duplicates', () => {
    expect(normalizeName('  A\u0301   Person  ')).toBe('Á Person');
    expect(nameError(['Al', 'AL', 'Bo', 'Cy'])).toBe('Each name must be different.');
    expect(nameError(['😀', 'Bob', 'Cy', 'De'])).toBe('Use 2 to 20 characters.');
  });
  it('round trips and rejects altered pairings, unknown fields and invalid scores', () => {
    let event: TournamentState = nextMatch(
      { names: ['Ada', 'Bo', 'Cy', 'De'], matches: [], phase: 'ready' },
      'np1-6-1',
    );
    event = recordResult(event, { moves: 18, elapsedMs: 12.5 });
    const text = encodeTournament({ tournament: event, snapshot: null });
    expect(decodeTournament(text).data?.tournament).toEqual(event);
    const data = JSON.parse(text);
    data[''] = true;
    expect(decodeTournament(JSON.stringify(data)).error).toBe('Unknown field: .');
    delete data[''];
    data.tournament.matches[0].players = [0, 1];
    expect(decodeTournament(JSON.stringify(data)).error).toBe('Invalid tournament.');
    data.tournament.matches[0].players = [0, 3];
    data.tournament.matches[0].results[0].extra = 1;
    expect(decodeTournament(JSON.stringify(data)).error).toBe('Unknown field: extra.');
    delete data.tournament.matches[0].results[0].extra;
    data.tournament.matches[0].results[0].moves = 1;
    expect(decodeTournament(JSON.stringify(data)).error).toBe('Invalid tournament.');
  });
});
