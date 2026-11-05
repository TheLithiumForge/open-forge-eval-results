import { describe, expect, it } from 'vitest';
import {
  nameError,
  nextMatch,
  normalizeName,
  opening,
  playersFor,
  recordResult,
  roundFor,
  validateTournament,
  winnerOf,
} from './tournament.ts';
import { decode, encode } from './tournament-exchange.ts';
import type { Match, TournamentState } from './tournament.ts';

describe('tournament rules', () => {
  it('normalizes names and checks code points and duplicates', () => {
    expect(normalizeName('  Cafe\u0301   Smith  ')).toBe('Café Smith');
    expect(nameError(['A😀', 'café'])).toBe('');
    expect(nameError(['A', 'Lee'])).toBe('Use 2 to 20 characters.');
    expect(nameError(['Café', 'CAFÉ'])).toBe('Each name must be different.');
  });
  it('uses the specified pairings, stages and winner advancement', () => {
    expect(opening(4)).toEqual([
      [0, 3],
      [1, 2],
    ]);
    expect(opening(8)).toEqual([
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
    ]);
    let t: TournamentState = {
      names: ['Ada', 'Bea', 'Cal', 'Dee', 'Eve', 'Fay', 'Gil', 'Hal'],
      matches: [],
      phase: 'ready',
    };
    for (let i = 0; i < 7; i++) {
      const size = roundFor(8, i).size;
      t = nextMatch(t, `np1-${size}-${i + 1}`);
      t = recordResult(t, { moves: size ** 2 / 2, elapsedMs: 100 });
      t = recordResult(t, { moves: size ** 2 / 2, elapsedMs: 200 });
      if (i === 3) expect(playersFor(t, 4)).toEqual([0, 3]);
      if (i === 5) expect(playersFor(t, 6)).toEqual([0, 2]);
    }
    expect(t.phase).toBe('complete');
    expect(t.matches.at(-1)?.winner).toBe(0);
    expect(validateTournament(JSON.parse(JSON.stringify(t)))).toEqual(t);
  });
  it('compares moves then precise active time then seed', () => {
    const match: Match = {
      boardCode: 'np1-6-1',
      players: [3, 0],
      results: [
        { moves: 20, elapsedMs: 100.5 },
        { moves: 21, elapsedMs: 1 },
      ],
      winner: null,
    };
    expect(winnerOf(match)).toBe(3);
    match.results = [
      { moves: 20, elapsedMs: 100.5 },
      { moves: 20, elapsedMs: 100.4 },
    ];
    expect(winnerOf(match)).toBe(0);
    match.results = [
      { moves: 20, elapsedMs: 100.5 },
      { moves: 20, elapsedMs: 100.5 },
    ];
    expect(winnerOf(match)).toBe(0);
  });
  it('round trips exchange and rejects unknown fields and inconsistent results', () => {
    let t: TournamentState = { names: ['Ada', 'Bea', 'Cal', 'Dee'], matches: [], phase: 'ready' };
    t = nextMatch(t, 'np1-6-1');
    expect(decode(encode(t, null)).tournament).toEqual(t);
    expect(() =>
      decode(
        '{"format":"neon-pairs/tournament","snapshot":null,"tournament":null,"version":1,"extra":0}',
      ),
    ).toThrow('Unknown field: extra.');
    const invalid = JSON.parse(JSON.stringify(t));
    invalid.matches[0].winner = 0;
    expect(() => validateTournament(invalid)).toThrow('Invalid tournament.');
  });
});
