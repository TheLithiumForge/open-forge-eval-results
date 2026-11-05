import { describe, expect, it } from 'vitest';
import { createTournament, normalizeNames, recordScore, roundSize } from './rules.ts';
import { exportTournament, readTournament } from './format.ts';

const names = ['Ada', 'Bo', 'Cora', 'Dev', 'Eve', 'Finn', 'Gail', 'Hana'];
const codes4 = ['np1-6-1', 'np1-6-2', 'np1-8-1'];
const codes8 = ['np1-4-1', 'np1-4-2', 'np1-4-3', 'np1-4-4', 'np1-6-1', 'np1-6-2', 'np1-8-1'];

describe('tournament rules', () => {
  it('normalizes names, counts code points, and rejects case-insensitive duplicates', () => {
    expect(normalizeNames(['  Cafe\u0301  Fox ', 'A😀']).names).toEqual(['Café Fox', 'A😀']);
    expect(normalizeNames(['A', 'Bo']).error).toBe('Use 2 to 20 characters.');
    expect(normalizeNames(['Ada', 'BO', 'ada']).error).toBe('Each name must be different.');
  });
  it('uses the documented pairings and stage sizes', () => {
    expect(createTournament(names.slice(0, 4), codes4).matches.map((m) => m.players)).toEqual([
      [0, 3],
      [1, 2],
      [null, null],
    ]);
    expect(createTournament(names, codes8).matches.map((m) => m.players)).toEqual([
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
      [null, null],
      [null, null],
      [null, null],
    ]);
    expect(codes8.map((_, i) => roundSize(8, i))).toEqual([4, 4, 4, 4, 6, 6, 8]);
  });
  it('compares moves, fractional time, then seed, and advances winners', () => {
    let t = createTournament(names.slice(0, 4), codes4);
    t = recordScore(t, { moves: 20, elapsedMs: 100 });
    t = recordScore(t, { moves: 21, elapsedMs: 1 });
    expect(t.matches[0]?.winner).toBe(0);
    expect(t.matches[2]?.players).toEqual([0, null]);
    t = { ...t, index: 1 };
    t = recordScore(t, { moves: 20, elapsedMs: 100.5 });
    t = recordScore(t, { moves: 20, elapsedMs: 100.4 });
    expect(t.matches[1]?.winner).toBe(2);
    t = { ...t, index: 2 };
    t = recordScore(t, { moves: 32, elapsedMs: 100 });
    t = recordScore(t, { moves: 32, elapsedMs: 100 });
    expect(t.matches[2]?.winner).toBe(0);
    expect(t.phase).toBe('complete');
    expect(readTournament(exportTournament(t)).data).toEqual(t);
  });
  it('round trips a handoff and rejects forged winners and unknown fields', () => {
    let t = createTournament(names.slice(0, 4), codes4);
    t = recordScore(t, { moves: 18, elapsedMs: 1 });
    t = { ...t, phase: 'ready' };
    expect(readTournament(exportTournament(t)).data).toEqual(t);
    const bad = JSON.parse(exportTournament(t));
    bad.matches[0].winner = 2;
    expect(readTournament(JSON.stringify(bad)).data).toBeNull();
    bad.extra = true;
    expect(readTournament(JSON.stringify(bad)).error).toBe('Unknown field: extra.');
  });
});
