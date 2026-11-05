import { describe, expect, it } from 'vitest';
import { activateCard, createGame } from '../game.ts';
import { encodeSnapshot } from '../snapshot.ts';
import {
  createTournament,
  currentMatch,
  currentPlayer,
  nextMatch,
  normalizeNames,
  recordResult,
} from './rules.ts';
import { decodeTournament, encodeTournament } from './format.ts';

const names = ['Ada', 'Bo', 'Cora', 'Dev'];
const first = () => createTournament(names, ['np1-6-1', 'np1-6-2']);
const score = (moves: number, elapsedMs: number) => ({ moves, elapsedMs });

describe('tournament rules', () => {
  it('normalizes names and rejects duplicate and out-of-range values', () => {
    expect(normalizeNames(['  A\u0301da  Smith ', 'Bo']).names).toEqual(['Áda Smith', 'Bo']);
    expect(normalizeNames(['Ada', ' ADA ']).error).toBe('Each name must be different.');
    expect(normalizeNames(['A', 'Bo']).error).toBe('Use 2 to 20 characters.');
    expect(normalizeNames(['😀a', 'Bo']).error).toBe('');
  });
  it('seeds both brackets in the specified order', () => {
    expect(first().rounds[0]!.map((m) => m.players)).toEqual([
      [0, 3],
      [1, 2],
    ]);
    expect(
      createTournament(
        [...names, 'Emi', 'Finn', 'Gia', 'Hal'],
        ['np1-4-1', 'np1-4-2', 'np1-4-3', 'np1-4-4'],
      ).rounds[0]!.map((m) => m.players),
    ).toEqual([
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
    ]);
  });
  it('compares moves, precise time, and finally seed while advancing winners', () => {
    let t = recordResult(first(), score(20, 500));
    expect(currentPlayer(t)).toBe(3);
    t = recordResult(t, score(21, 1));
    expect(t.rounds[0]![0]!.winner).toBe(0);
    t = nextMatch(t, []);
    t = recordResult(t, score(20, 500.5));
    t = recordResult(t, score(20, 500.1));
    expect(t.rounds[0]![1]!.winner).toBe(2);
    t = nextMatch(t, ['np1-8-3']);
    expect(currentMatch(t).players).toEqual([0, 2]);
    t = recordResult(recordResult(t, score(32, 100)), score(32, 100));
    expect(t.phase).toBe('complete');
    expect(currentMatch(t).winner).toBe(0);
    expect(decodeTournament(encodeTournament(t)).tournament).toEqual(t);
  });
  it('round-trips precise active time alongside a playing snapshot', () => {
    const game = { ...activateCard(createGame('np1-6-1'), 0), elapsedMs: 1234.75 };
    const playing = {
      ...first(),
      phase: 'playing' as const,
      snapshot: encodeSnapshot(game),
      elapsedMs: game.elapsedMs,
    };
    expect(decodeTournament(encodeTournament(playing)).tournament).toEqual(playing);
    expect(
      decodeTournament(encodeTournament({ ...playing, elapsedMs: 1235.75 })).tournament,
    ).toBeNull();
  });
  it('rejects unknown fields and inconsistent results without replacing data', () => {
    const data = JSON.parse(encodeTournament(first()));
    data.tournament.rounds[0][0].surprise = 1;
    expect(decodeTournament(JSON.stringify(data)).error).toBe('Unknown field: surprise.');
    delete data.tournament.rounds[0][0].surprise;
    data.tournament.rounds[0][0].winner = 0;
    expect(decodeTournament(JSON.stringify(data)).tournament).toBeNull();
  });
});
