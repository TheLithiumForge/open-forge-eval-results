import { isWon } from '../game.ts';
import type { GameState } from '../game.ts';
import { tournamentPlan } from './pairing.ts';
import type { TournamentMatch, TournamentResult } from './pairing.ts';
import type { Tournament, TournamentPlayer } from './types.ts';

export function normalizeName(draft: string): string {
  return draft.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function acceptNames(drafts: readonly string[], count: number): string[] | string {
  if (drafts.length !== count) return 'Choose 4 or 8 players.';
  const names = drafts.map(normalizeName);
  if (names.some((name) => [...name].length < 2 || [...name].length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(names.map((name) => name.toLowerCase())).size !== count)
    return 'Each name must be different.';
  return names;
}

export function createTournament(
  names: readonly string[],
  boardCodes: readonly string[],
): Tournament | null {
  if (names.length !== 4 && names.length !== 8) return null;
  const players = names.map((name, index) => ({ name, seed: index + 1 }));
  const plan = tournamentPlan(players);
  if (boardCodes.length !== plan.length) return null;
  const matches: TournamentMatch[] = [];
  for (const [index, item] of plan.entries()) {
    const boardCode = boardCodes[index];
    if (!boardCode) return null;
    matches.push({
      boardCode,
      players: item.players,
      results: [null, null],
      round: item.round,
      winner: null,
    });
  }
  return {
    champion: null,
    currentMatch: 0,
    currentTurn: 0,
    game: null,
    matches,
    playerCount: names.length,
    players,
  };
}

export function completeTournamentTurn(tournament: Tournament, game: GameState): Tournament {
  const match = tournament.matches[tournament.currentMatch];
  if (!match || match.winner || match.results[tournament.currentTurn] || !isWon(game))
    return tournament;
  const result: TournamentResult = { elapsedMs: game.elapsedMs, moves: game.moves };
  const results: [TournamentResult | null, TournamentResult | null] =
    tournament.currentTurn === 0 ? [result, match.results[1]] : [match.results[0], result];
  if (tournament.currentTurn === 0) {
    return {
      ...tournament,
      game,
      matches: replaceMatch(tournament.matches, tournament.currentMatch, { ...match, results }),
    };
  }
  const first = match.players[0];
  const second = match.players[1];
  const firstResult = results[0];
  const secondResult = results[1];
  if (!first || !second || !firstResult || !secondResult) return tournament;
  const winner =
    compareTournamentResults(first, firstResult, second, secondResult) <= 0 ? first : second;
  const completed = { ...match, results, winner };
  const matches = replaceMatch(tournament.matches, tournament.currentMatch, completed);
  if (match.round === 'Final') return { ...tournament, champion: winner, game, matches };
  return { ...tournament, game, matches: advanceWinner(matches, tournament.currentMatch, winner) };
}

export function nextTournamentTurn(tournament: Tournament): Tournament {
  const match = tournament.matches[tournament.currentMatch];
  if (
    tournament.currentTurn !== 0 ||
    !match?.results[0] ||
    !tournament.game ||
    !isWon(tournament.game)
  )
    return tournament;
  return { ...tournament, currentTurn: 1, game: null };
}

export function nextTournamentMatch(tournament: Tournament): Tournament {
  const match = tournament.matches[tournament.currentMatch];
  if (
    !match?.winner ||
    tournament.champion ||
    tournament.currentMatch + 1 >= tournament.matches.length
  )
    return tournament;
  return { ...tournament, currentMatch: tournament.currentMatch + 1, currentTurn: 0, game: null };
}

export function compareTournamentResults(
  first: TournamentPlayer,
  firstResult: TournamentResult,
  second: TournamentPlayer,
  secondResult: TournamentResult,
): number {
  return (
    firstResult.moves - secondResult.moves ||
    firstResult.elapsedMs - secondResult.elapsedMs ||
    first.seed - second.seed
  );
}

function replaceMatch(matches: readonly TournamentMatch[], index: number, match: TournamentMatch) {
  return matches.map((entry, position) => (position === index ? match : entry));
}

function advanceWinner(
  matches: readonly TournamentMatch[],
  index: number,
  winner: TournamentPlayer,
): readonly TournamentMatch[] {
  const match = matches[index];
  if (!match) return matches;
  const localIndex = matches.slice(0, index).filter((entry) => entry.round === match.round).length;
  const nextRoundStart = matches.findIndex(
    (entry, position) => position > index && entry.round !== match.round,
  );
  const nextIndex = nextRoundStart + Math.floor(localIndex / 2);
  const next = matches[nextIndex];
  if (!next || nextRoundStart < 0) return matches;
  const players: [TournamentPlayer | null, TournamentPlayer | null] =
    localIndex % 2 === 0 ? [winner, next.players[1]] : [next.players[0], winner];
  return replaceMatch(matches, nextIndex, { ...next, players });
}
