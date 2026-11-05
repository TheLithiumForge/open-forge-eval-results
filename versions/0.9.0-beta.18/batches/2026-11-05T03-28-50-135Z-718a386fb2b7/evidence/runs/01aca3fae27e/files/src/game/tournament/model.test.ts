import { createTournament } from './create-tournament.ts';
import { exportTournament, importTournament } from './exchange.ts';
import { isTournament } from './validation.ts';
import { describe, expect, it } from 'vitest';
import { nameError, normalizeName, recordResult } from './model.ts';

describe('tournament rules', () => {
  it('normalizes names and applies code-point length and group uniqueness', () => {
    expect(normalizeName('  Cafe\u0301   😀  ')).toBe('Café 😀');
    expect(nameError(['A😀', 'Another'])).toBe('');
    expect(nameError(['A', 'Another'])).toBe('Use 2 to 20 characters.');
    expect(nameError(['Mira', 'mira'])).toBe('Each name must be different.');
  });
  it('seeds eight entrants, assigns unique stage deals, and compares moves, time and seed', () => {
    let t = createTournament(['Aa', 'Bb', 'Cc', 'Dd', 'Ee', 'Ff', 'Gg', 'Hh']);
    expect(t.matches.slice(0, 4).map((m) => m.players)).toEqual([
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
    ]);
    expect(t.matches.map((m) => m.boardCode.split('-')[1])).toEqual([
      '4',
      '4',
      '4',
      '4',
      '6',
      '6',
      '8',
    ]);
    expect(new Set(t.matches.map((m) => m.boardCode)).size).toBe(7);
    t = recordResult(t, { moves: 8, elapsedMs: 1200 });
    t = recordResult(t, { moves: 9, elapsedMs: 100 });
    expect(t.matches[0]!.winner).toBe(0);
    t = { ...t, index: 1 };
    t = recordResult(t, { moves: 8, elapsedMs: 1200.5 });
    t = recordResult(t, { moves: 8, elapsedMs: 1200 });
    expect(t.matches[1]!.winner).toBe(4);
    t = { ...t, index: 2 };
    t = recordResult(t, { moves: 8, elapsedMs: 100 });
    t = recordResult(t, { moves: 8, elapsedMs: 100 });
    expect(t.matches[2]!.winner).toBe(2);
    expect(isTournament(t)).toBe(true);
    expect(importTournament(exportTournament(t)).tournament).toEqual(t);
    const corrupted = JSON.parse(exportTournament(t));
    corrupted.tournament.matches[0].winner = 7;
    expect(importTournament(JSON.stringify(corrupted)).error).toBe('Invalid tournament.');
    corrupted.tournament.matches[0].extra = 1;
    expect(importTournament(JSON.stringify(corrupted)).error).toBe('Unknown field: extra.');
  });
});
