import { describe, expect, test } from 'vitest';
import { boardCode } from '../deck.ts';
import { createGame } from '../game.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { readTournament } from './format.ts';
import {
  advanceMatch,
  createTournament,
  currentMatch,
  recordScore,
  updateMatch,
} from './tournament.ts';
import type { TournamentData } from './tournament.ts';

function playMatch(data: TournamentData, firstMoves: number, secondMoves: number): TournamentData {
  const match = { ...currentMatch(data), boardCode: boardCode(4, 123) };
  data = { ...updateMatch(data, match), phase: 'playing' };
  data = recordScore(data, { moves: firstMoves, elapsedMs: 1000 });
  data = { ...data, phase: 'playing', turn: 1 };
  return recordScore(data, { moves: secondMoves, elapsedMs: 2000 });
}

describe('knockout tournaments', () => {
  test.each([4, 8])('advances winners through a %i player bracket', (count) => {
    let data = createTournament(
      Array.from({ length: count }, (_, i) => `Player ${i + 1}`),
      4,
    );
    for (let match = 0; match < count - 1; match++) {
      data = playMatch(data, 8, 9);
      expect(currentMatch(data).winner).toBe(currentMatch(data).players[0]);
      data = advanceMatch(data);
    }
    expect(data.phase).toBe('complete');
    expect(data.names[currentMatch(data).winner ?? -1]).toBe('Player 1');
    expect(readTournament(JSON.stringify(data))).toEqual(data);
  });
  test('uses time for equal moves and replays exact ties on a fresh deal', () => {
    let data = createTournament(['A', 'B', 'C', 'D'], 4);
    data = playMatch(data, 8, 8);
    expect(currentMatch(data).winner).toBe(0);
    data = createTournament(['A', 'B', 'C', 'D'], 4);
    data = {
      ...updateMatch(data, { ...currentMatch(data), boardCode: boardCode(4, 1) }),
      phase: 'playing',
    };
    data = recordScore(data, { moves: 8, elapsedMs: 1000 });
    data = recordScore({ ...data, turn: 1, phase: 'playing' }, { moves: 8, elapsedMs: 1000 });
    expect(data.phase).toBe('ready');
    expect(currentMatch(data).boardCode).toBeNull();
    expect(currentMatch(data).scores).toEqual([null, null]);
  });
  test('round trips an active snapshot and rejects a snapshot for a different deal', () => {
    let data = createTournament(['A', 'B', 'C', 'D'], 4);
    const code = boardCode(4, 1);
    data = {
      ...updateMatch(data, { ...currentMatch(data), boardCode: code }),
      phase: 'playing',
      snapshot: encodeSnapshot(createGame(code)),
    };
    expect(readTournament(JSON.stringify(data))).toEqual(data);
    data.snapshot = encodeSnapshot(createGame(boardCode(4, 2)));
    expect(readTournament(JSON.stringify(data))).toBeNull();
  });
  test('rejects imported brackets that could not arise from play', () => {
    const data = createTournament(['A', 'B', 'C', 'D'], 4);
    expect(readTournament(JSON.stringify({ ...data, turn: 1 }))).toBeNull();
    expect(readTournament(JSON.stringify({ ...data, phase: 'complete' }))).toBeNull();
    const altered = updateMatch(data, { ...currentMatch(data), players: [1, 0] });
    expect(readTournament(JSON.stringify(altered))).toBeNull();
  });
});
