import { createGame, isWon } from '../game.ts';
import { tournamentBracket } from './bracket.ts';
import type { GameState } from '../game.ts';

export interface TurnResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface TournamentMatch {
  readonly boardCode: string;
  readonly results: readonly TurnResult[];
}

export interface TournamentRecord {
  readonly id: string;
  readonly createdAt: number;
  readonly players: readonly string[];
  readonly matches: readonly TournamentMatch[];
}

export interface TournamentProgress {
  readonly tournament: TournamentRecord;
  readonly matchIndex: number;
  readonly phase: 'ready' | 'playing' | 'turn-complete' | 'match-complete' | 'complete';
  readonly game: GameState | null;
}

export interface TournamentWorkspace {
  readonly active: TournamentProgress | null;
  readonly past: readonly TournamentRecord[];
}

export function createTournament(
  players: readonly string[],
  codes: readonly string[],
  id: string,
  createdAt: number,
): TournamentProgress {
  if (
    (players.length !== 4 && players.length !== 8) ||
    players.some((name) => !name.trim() || name.trim().length > 80) ||
    codes.length !== players.length - 1
  )
    throw new Error('Choose 4 or 8 players and enter every name.');
  return {
    tournament: {
      id,
      createdAt,
      players: players.map((name) => name.trim()),
      matches: codes.map((boardCode) => ({ boardCode, results: [] })),
    },
    matchIndex: 0,
    phase: 'ready',
    game: null,
  };
}

export function startTournamentTurn(progress: TournamentProgress): TournamentProgress {
  const match = progress.tournament.matches[progress.matchIndex];
  if (progress.phase !== 'ready' || !match) return progress;
  return {
    ...progress,
    phase: 'playing',
    game: progress.game ?? { ...createGame(match.boardCode), started: true },
  };
}

export function finishTournamentTurn(
  progress: TournamentProgress,
  game: GameState,
): TournamentProgress {
  const { tournament, matchIndex } = progress;
  const match = tournament.matches[matchIndex];
  if (progress.phase !== 'playing' || !match || match.boardCode !== game.boardCode || !isWon(game))
    return progress;
  const results = [...match.results, { moves: game.moves, elapsedMs: Math.floor(game.elapsedMs) }];
  const next = {
    ...tournament,
    matches: tournament.matches.map((entry, index) =>
      index === matchIndex ? { ...entry, results } : entry,
    ),
  };
  const champion = tournamentBracket(next).at(-1)?.winner;
  return {
    tournament: next,
    matchIndex,
    phase:
      results.length === 1
        ? 'turn-complete'
        : champion !== null && champion !== undefined
          ? 'complete'
          : 'match-complete',
    game: null,
  };
}

export function advanceTournament(
  progress: TournamentProgress,
  replayCode: string,
): TournamentProgress {
  if (progress.phase === 'turn-complete') return { ...progress, phase: 'ready' };
  if (progress.phase !== 'match-complete') return progress;
  const tied = tournamentBracket(progress.tournament)[progress.matchIndex]?.winner === null;
  return {
    ...progress,
    phase: 'ready',
    matchIndex: progress.matchIndex + (tied ? 0 : 1),
    tournament: tied
      ? {
          ...progress.tournament,
          matches: progress.tournament.matches.map((match, index) =>
            index === progress.matchIndex ? { boardCode: replayCode, results: [] } : match,
          ),
        }
      : progress.tournament,
  };
}
