import { describe, expect, it } from 'vitest';
import {
  createTournament,
  nameError,
  normalizeName,
  recordResult,
  roundName,
  roundSize,
} from './rules.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import type { Tournament } from './rules.ts';

const names = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
const codes = ['np1-4-1', 'np1-4-2', 'np1-4-3', 'np1-4-4', 'np1-6-1', 'np1-6-2', 'np1-8-1'];
function result(t: Tournament, moves: number, elapsedMs: number): Tournament {
  return recordResult({ ...t, phase: 'playing' }, { moves, elapsedMs });
}
describe('tournament rules', () => {
  it('normalizes names and checks Unicode lengths and duplicates', () => {
    expect(normalizeName('  Cafe\u0301   Smith  ')).toBe('Café Smith');
    expect(nameError(['A😀', 'Bo'])).toBe('');
    expect(nameError(['A', 'Bo'])).toBe('Use 2 to 20 characters.');
    expect(nameError(['Mira', 'mira'])).toBe('Each name must be different.');
  });
  it('seeds eight players and advances winners on moves, time, then seed', () => {
    let t = createTournament(names, codes);
    expect(t.matches.slice(0, 4).map((m) => m.players)).toEqual([
      [0, 7],
      [3, 4],
      [2, 5],
      [1, 6],
    ]);
    expect(t.matches.map((_, i) => [roundName(8, i), roundSize(8, i)])).toEqual([
      ['Quarterfinal', 4],
      ['Quarterfinal', 4],
      ['Quarterfinal', 4],
      ['Quarterfinal', 4],
      ['Semifinal', 6],
      ['Semifinal', 6],
      ['Final', 8],
    ]);
    t = result(result(t, 9, 200), 8, 500);
    expect(t.matches[0]?.winner).toBe(7);
    t = { ...t, current: 1, phase: 'ready' };
    t = result(result(t, 8, 200), 8, 100);
    expect(t.matches[1]?.winner).toBe(4);
    expect(t.matches[4]?.players).toEqual([7, 4]);
    t = { ...t, current: 2, phase: 'ready' };
    t = result(result(t, 8, 100), 8, 100);
    expect(t.matches[2]?.winner).toBe(2);
  });
  it('round trips and rejects tampering and unknown fields', () => {
    const t = result(
      createTournament(names.slice(0, 4), ['np1-6-1', 'np1-6-2', 'np1-8-1']),
      18,
      123.5,
    );
    const text = encodeTournament({ tournament: t, snapshot: null });
    expect(decodeTournament(text).document?.tournament).toEqual(t);
    const data = JSON.parse(text);
    data.tournament.matches[0].winner = 0;
    expect(decodeTournament(JSON.stringify(data)).document).toBeNull();
    data.tournament.matches[0].surprise = 1;
    expect(decodeTournament(JSON.stringify(data)).error).toBe('Unknown field: surprise.');
  });
});
