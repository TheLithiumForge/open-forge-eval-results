import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { activeTournamentMatch } from './tournament.ts';
import type {
  Tournament,
  TournamentMatch,
  TournamentPhase,
  TournamentResult,
} from './tournament.ts';

export function compareTournamentResults(
  first: TournamentResult,
  second: TournamentResult,
): number {
  if (first.moves !== second.moves) return first.moves < second.moves ? first.seed : second.seed;
  if (first.elapsedMs !== second.elapsedMs)
    return first.elapsedMs < second.elapsedMs ? first.seed : second.seed;
  return Math.min(first.seed, second.seed);
}

export function recordTournamentResult(
  tournament: Tournament,
  moves: number,
  elapsedMs: number,
): Tournament {
  const match = activeTournamentMatch(tournament);
  const seed = match?.players[tournament.turn];
  if (
    tournament.phase !== 'playing' ||
    !match ||
    seed === null ||
    seed === undefined ||
    !Number.isSafeInteger(moves) ||
    moves < 0 ||
    moves > MOVES_MAX ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < 0 ||
    elapsedMs > ELAPSED_MAX_MS
  )
    return tournament;
  const result: TournamentResult = { seed, moves, elapsedMs };
  const results: readonly [TournamentResult | null, TournamentResult | null] =
    tournament.turn === 0 ? [result, match.results[1]] : [match.results[0], result];
  if (tournament.turn === 0)
    return replaceCurrentMatch(tournament, { ...match, results }, 'turn-finished');
  const first = results[0];
  const second = results[1];
  if (!first || !second) return tournament;
  const winner = compareTournamentResults(first, second);
  return replaceCurrentMatch(tournament, { ...match, results, winner }, 'match-finished');
}

function replaceCurrentMatch(
  tournament: Tournament,
  match: TournamentMatch,
  phase: TournamentPhase,
): Tournament {
  return {
    ...tournament,
    phase,
    matches: tournament.matches.map((item, index) =>
      index === tournament.currentMatch ? match : item,
    ),
  };
}

export function nextTournamentMatch(tournament: Tournament): Tournament {
  if (tournament.phase !== 'match-finished') return tournament;
  const current = activeTournamentMatch(tournament);
  if (!current || current.winner === null) return tournament;
  const pending = tournament.matches.findIndex(
    (match, index) =>
      index > tournament.currentMatch &&
      match.round === current.round &&
      match.winner === null &&
      match.players[0] !== null &&
      match.players[1] !== null,
  );
  if (pending >= 0) return { ...tournament, currentMatch: pending, turn: 0, phase: 'ready' };
  const roundMatches = tournament.matches.filter((match) => match.round === current.round);
  if (!roundMatches.every((match) => match.winner !== null)) return tournament;
  const nextRound = tournament.matches.filter((match) => match.round === current.round + 1);
  if (nextRound.length === 0) return { ...tournament, phase: 'finished', champion: current.winner };
  const previousStart = tournament.matches.findIndex((match) => match.round === current.round);
  const matches = tournament.matches.map((match) => {
    if (match.round !== current.round + 1) return match;
    const matchInRound = nextRound.indexOf(match);
    const firstIndex = previousStart + matchInRound * 2;
    const first = tournament.matches[firstIndex]?.winner ?? null;
    const second = tournament.matches[firstIndex + 1]?.winner ?? null;
    return { ...match, players: [first, second] as const };
  });
  const nextIndex = matches.findIndex((match) => match.round === current.round + 1);
  return { ...tournament, matches, currentMatch: nextIndex, turn: 0, phase: 'ready' };
}
