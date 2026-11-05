import { describe, expect, it } from 'vitest';
import { decodeExchange, encodeExchange } from './format.ts';
import { namesError, nextPlayers, normalizeName, roundSize, winner } from './model.ts';
import type { TournamentState } from './model.ts';

describe('tournament rules', () => {
  it('normalizes names and checks code points and duplicates', () => {
    expect(normalizeName('  Cafe\u0301 \t Smith  ')).toBe('Café Smith');
    expect(namesError(['A😀', 'Bo'])).toBe('');
    expect(namesError(['A', 'Bo'])).toBe('Use 2 to 20 characters.');
    expect(namesError(['Alice', 'alice'])).toBe('Each name must be different.');
  });
  it('seeds the brackets and selects by moves, precise time, then seed', () => {
    const t: TournamentState = {
      names: ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'],
      matches: [],
    };
    const expected: [number, number][] = [
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
      [0, 3],
      [2, 1],
      [0, 1],
    ];
    expected.forEach((players, i) => {
      expect(nextPlayers(t)).toEqual(players);
      const match = {
        players,
        code: `code${i}`,
        results: [
          { moves: 8, elapsedMs: 100.5 },
          { moves: 8, elapsedMs: 100.5 },
        ],
      };
      expect(winner(match)).toBe(Math.min(...players));
      t.matches.push(match);
    });
    expect(nextPlayers(t)).toBeNull();
    expect([0, 3, 4, 5, 6].map((i) => roundSize(8, i))).toEqual([4, 4, 6, 6, 8]);
    expect(
      winner({
        players: [1, 0],
        code: '',
        results: [
          { moves: 9, elapsedMs: 1 },
          { moves: 8, elapsedMs: 100 },
        ],
      }),
    ).toBe(0);
    expect(
      winner({
        players: [0, 1],
        code: '',
        results: [
          { moves: 8, elapsedMs: 10.2 },
          { moves: 8, elapsedMs: 10.1 },
        ],
      }),
    ).toBe(1);
  });
  it('round trips and rejects extra fields and inconsistent bracket data', () => {
    const t: TournamentState = {
      names: ['Ada', 'Bo', 'Cora', 'Dev'],
      matches: [{ players: [0, 3], code: 'np1-6-1', results: [] }],
    };
    const text = encodeExchange({ tournament: t, snapshot: null });
    expect(decodeExchange(text).data).toEqual({ tournament: t, snapshot: null });
    expect(decodeExchange(text.replace('"version": 1', '"other": 1, "version": 1')).error).toBe(
      'Unknown field: other.',
    );
    expect(decodeExchange(text.replace('np1-6-1', 'np1-4-1')).data).toBeUndefined();
    expect(decodeExchange(text.replace('"Ada"', '"A"')).data).toBeUndefined();
  });
});
