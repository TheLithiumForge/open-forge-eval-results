import { isWon, type GameState } from '../game.ts';
import { parseBoardCode } from '../deck.ts';
import { compareTournamentResults } from './rules.ts';
import { tournamentPlan } from './pairing.ts';
import type { TournamentMatch, TournamentResult } from './pairing.ts';
import type { Tournament, TournamentPlayer } from './types.ts';

export function isValidTournament(tournament: Tournament): boolean {
  const plan = tournamentPlan(tournament.players);
  if (tournament.matches.length !== plan.length || tournament.currentMatch >= plan.length)
    return false;
  const codes = new Set<string>();
  for (const [index, match] of tournament.matches.entries()) {
    const expected = plan[index];
    const parsed = parseBoardCode(match.boardCode);
    if (!expected || !parsed || parsed.size !== expected.boardSize || codes.has(match.boardCode))
      return false;
    codes.add(match.boardCode);
    if (
      match.round !== expected.round ||
      !validParticipants(tournament.matches, plan, index, match)
    )
      return false;
    if (!validMatchResult(match, parsed.size)) return false;
    if (index < tournament.currentMatch && !match.winner) return false;
    if (index > tournament.currentMatch && (match.winner || match.results[0] || match.results[1]))
      return false;
  }
  return validCurrentState(tournament);
}

function validParticipants(
  matches: readonly TournamentMatch[],
  plan: ReturnType<typeof tournamentPlan>,
  index: number,
  match: TournamentMatch,
): boolean {
  const expected = plan[index];
  const firstStage = matches.findIndex((entry) => entry.round !== matches[0]?.round);
  if (!expected) return false;
  if (index < firstStage || firstStage < 0)
    return (
      samePlayer(match.players[0], expected.players[0]) &&
      samePlayer(match.players[1], expected.players[1])
    );
  const stageStart = matches.findIndex(
    (entry, position) => position <= index && entry.round === match.round,
  );
  const previousRound = matches[stageStart - 1]?.round;
  let previousStart = stageStart - 1;
  while (previousStart > 0 && matches[previousStart - 1]?.round === previousRound)
    previousStart -= 1;
  const local = index - stageStart;
  const source0 = matches[previousStart + local * 2];
  const source1 = matches[previousStart + local * 2 + 1];
  return (
    Boolean(source0 && source1) &&
    samePlayer(match.players[0], source0?.winner ?? null) &&
    samePlayer(match.players[1], source1?.winner ?? null)
  );
}

function validMatchResult(match: TournamentMatch, size: number): boolean {
  const [first, second] = match.results;
  if (second && !first) return false;
  for (const result of match.results) {
    if (result && result.moves < (size * size) / 2) return false;
  }
  if (!first || !second) return match.winner === null;
  const player1 = match.players[0];
  const player2 = match.players[1];
  if (!player1 || !player2) return false;
  const expected =
    compareTournamentResults(player1, first, player2, second) <= 0 ? player1 : player2;
  return samePlayer(match.winner, expected);
}

function validCurrentState(tournament: Tournament): boolean {
  const match = tournament.matches[tournament.currentMatch];
  if (!match?.players[0] || !match.players[1]) return false;
  if (tournament.currentTurn === 1 && !match.results[0]) return false;
  const currentResult = match.results[tournament.currentTurn];
  if (tournament.game) {
    if (!validCurrentGame(tournament.game, match, currentResult)) return false;
  } else {
    if (tournament.currentTurn === 0 && match.results[0]) return false;
    if (match.winner && !tournament.champion) return false;
    if (match.results[1] && !tournament.champion) return false;
  }
  return validChampion(tournament, match);
}

function validCurrentGame(
  game: GameState,
  match: TournamentMatch,
  result: TournamentResult | null,
): boolean {
  if (game.boardCode !== match.boardCode) return false;
  if (isWon(game))
    return Boolean(
      result && result.moves === game.moves && Math.floor(result.elapsedMs) === game.elapsedMs,
    );
  return result === null;
}

function validChampion(tournament: Tournament, current: TournamentMatch): boolean {
  const finalMatch = tournament.matches[tournament.matches.length - 1];
  if (!tournament.champion) return current.round !== 'Final' || finalMatch?.winner === null;
  return (
    tournament.currentMatch === tournament.matches.length - 1 &&
    tournament.currentTurn === 1 &&
    samePlayer(tournament.champion, finalMatch?.winner ?? null) &&
    tournament.matches.every((match) => match.winner !== null)
  );
}

function samePlayer(first: TournamentPlayer | null, second: TournamentPlayer | null): boolean {
  return first?.seed === second?.seed && first?.name === second?.name;
}
