import { createGame } from '../game.ts';
import type { TournamentRecord, TournamentState } from './model.ts';

export function tournamentRecord(tournament: TournamentState): TournamentRecord {
  if (
    tournament.phase !== 'finished' ||
    tournament.championSeed === null ||
    tournament.completedAtMs === null
  )
    throw new Error('Tournament is not complete.');
  return {
    startedAtMs: tournament.startedAtMs,
    completedAtMs: tournament.completedAtMs,
    players: tournament.players,
    rounds: tournament.rounds,
    championSeed: tournament.championSeed,
  };
}

export function restoreTournamentRecord(record: TournamentRecord): TournamentState {
  const currentRound = record.rounds.length - 1;
  const currentMatch = (record.rounds[currentRound]?.matches.length ?? 1) - 1;
  const finalMatch = record.rounds[currentRound]?.matches[currentMatch];
  if (!finalMatch) throw new Error('Invalid tournament record.');
  return {
    startedAtMs: record.startedAtMs,
    completedAtMs: record.completedAtMs,
    players: record.players,
    rounds: record.rounds,
    currentRound,
    currentMatch,
    currentTurn: 1,
    phase: 'finished',
    championSeed: record.championSeed,
    game: createGame(finalMatch.boardCode),
    generation: 0,
    paused: true,
  };
}
