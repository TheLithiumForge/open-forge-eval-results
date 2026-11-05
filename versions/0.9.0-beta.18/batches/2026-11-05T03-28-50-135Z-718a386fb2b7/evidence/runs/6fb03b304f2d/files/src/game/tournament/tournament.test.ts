import { describe, expect, it } from 'vitest';
import {
  createTournament,
  encodeExchange,
  nameError,
  normalizeName,
  recordScore,
  roundName,
} from './tournament.ts';
import { decodeExchange } from './decode.ts';

describe('tournament', () => {
  it('normalizes and validates player names by code point and case', () => {
    expect(normalizeName('  Jose\u0301  Smith  ')).toBe('José Smith');
    expect(nameError(['A😀', 'AL'])).toBe('');
    expect(nameError(['A', 'Bill'])).toBe('Use 2 to 20 characters.');
    expect(nameError(['AL', 'al'])).toBe('Each name must be different.');
  });
  it('seeds eight players, advances winners and compares moves, time and seed', () => {
    let t = createTournament(['Ada', 'Bo', 'Cora', 'Dev', 'Eve', 'Finn', 'Gus', 'Hal']);
    expect(t.matches.map((m) => m.players)).toEqual([
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
      [null, null],
      [null, null],
      [null, null],
    ]);
    expect(t.matches.map((_, i) => roundName(8, i))).toEqual([
      'Quarterfinal',
      'Quarterfinal',
      'Quarterfinal',
      'Quarterfinal',
      'Semifinal',
      'Semifinal',
      'Final',
    ]);
    expect(new Set(t.matches.map((m) => m.code)).size).toBe(7);
    t = recordScore(t, { moves: 9, elapsedMs: 100 });
    t = recordScore(t, { moves: 8, elapsedMs: 200 });
    expect(t.matches[0]?.winner).toBe(7);
    expect(t.matches[4]?.players).toEqual([7, null]);
    t = { ...t, current: 1, phase: 'ready' };
    t = recordScore(t, { moves: 8, elapsedMs: 100 });
    t = recordScore(t, { moves: 8, elapsedMs: 99 });
    expect(t.matches[1]?.winner).toBe(4);
    t = { ...t, current: 2, phase: 'ready' };
    t = recordScore(t, { moves: 8, elapsedMs: 100 });
    t = recordScore(t, { moves: 8, elapsedMs: 100 });
    expect(t.matches[2]?.winner).toBe(2);
  });
  it('round-trips a bracket and rejects inconsistent results and unknown fields', () => {
    const t = createTournament(['Ada', 'Bo', 'Cora', 'Dev']);
    const text = encodeExchange(t, null);
    expect(decodeExchange(text).value?.tournament).toEqual(t);
    expect(decodeExchange(text.replace('"current": 0', '"current": 1')).error).toBe(
      'Invalid tournament.',
    );
    expect(
      decodeExchange(text.replace('"current": 0', '"unexpected": true, "current": 0')).error,
    ).toBe('Unknown field: unexpected.');
  });
});
