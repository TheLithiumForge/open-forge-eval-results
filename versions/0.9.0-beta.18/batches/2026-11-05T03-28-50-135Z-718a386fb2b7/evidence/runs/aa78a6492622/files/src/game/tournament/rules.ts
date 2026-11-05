import { parseBoardCode } from '../deck.ts';
import { createGame, isWon } from '../game.ts';
import type { GameState } from '../game.ts';
import { matchPlans } from './pairing.ts';
export { matchPlans } from './pairing.ts';

export type PlayerCount = 4 | 8;
export type TournamentRound = 'Quarterfinal' | 'Semifinal' | 'Final';
export type TournamentPhase = 'ready' | 'playing' | 'turnComplete' | 'finished';

export interface Entrant {
  readonly seed: number;
  readonly name: string;
}

export interface TournamentResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface TournamentMatch {
  readonly round: TournamentRound;
  readonly number: number;
  readonly size: number;
  readonly boardCode: string;
  readonly playerSeeds: readonly [number | null, number | null];
  readonly results: readonly [TournamentResult | null, TournamentResult | null];
  readonly winnerSeed: number | null;
  readonly advanceTo: { readonly matchIndex: number; readonly slot: 0 | 1 } | null;
}

export interface Tournament {
  readonly playerCount: PlayerCount;
  readonly players: readonly Entrant[];
  readonly matches: readonly TournamentMatch[];
  readonly currentMatchIndex: number;
  readonly currentTurn: 0 | 1;
  readonly phase: TournamentPhase;
  readonly currentGame: GameState | null;
  readonly createdAt: string;
  readonly finishedAt: string | null;
}

export function createTournament(
  players: readonly Entrant[],
  boardCodes: readonly string[],
  createdAt: string,
): Tournament {
  const playerCount = players.length === 4 ? 4 : players.length === 8 ? 8 : null;
  if (!playerCount) throw new Error('Invalid tournament setup.');
  const plans = matchPlans(playerCount);
  if (boardCodes.length !== plans.length) throw new Error('Invalid tournament setup.');
  const seen = new Set<string>();
  const matches = plans.map((plan, index): TournamentMatch => {
    const boardCode = boardCodes[index];
    if (!boardCode) throw new Error('Invalid tournament deal.');
    const parsed = parseBoardCode(boardCode);
    if (!parsed || parsed.size !== plan.size || seen.has(boardCode))
      throw new Error('Invalid tournament deal.');
    seen.add(boardCode);
    return { ...plan, boardCode, results: [null, null], winnerSeed: null };
  });
  return {
    playerCount,
    players,
    matches,
    currentMatchIndex: 0,
    currentTurn: 0,
    phase: 'ready',
    currentGame: null,
    createdAt,
    finishedAt: null,
  };
}

export function currentMatch(tournament: Tournament): TournamentMatch {
  const match = tournament.matches[tournament.currentMatchIndex];
  if (!match) throw new Error('Tournament match is missing.');
  return match;
}

export function currentPlayer(tournament: Tournament): Entrant | null {
  const seed = currentMatch(tournament).playerSeeds[tournament.currentTurn];
  return tournament.players.find((player) => player.seed === seed) ?? null;
}

export function beginTurn(tournament: Tournament): Tournament {
  if (tournament.phase !== 'ready') return tournament;
  return {
    ...tournament,
    phase: 'playing',
    currentGame: createGame(currentMatch(tournament).boardCode),
  };
}

export function finishTurn(
  tournament: Tournament,
  game: GameState,
  finishedAt: string,
): Tournament {
  const match = currentMatch(tournament);
  if (tournament.phase !== 'playing' || !isWon(game) || game.boardCode !== match.boardCode)
    return tournament;
  const results: [TournamentResult | null, TournamentResult | null] = [...match.results];
  results[tournament.currentTurn] = { moves: game.moves, elapsedMs: game.elapsedMs };
  const matches = [...tournament.matches];
  if (tournament.currentTurn === 0) {
    matches[tournament.currentMatchIndex] = { ...match, results };
    return { ...tournament, matches, phase: 'turnComplete', currentGame: game };
  }
  const firstSeed = match.playerSeeds[0];
  const secondSeed = match.playerSeeds[1];
  const first = results[0];
  const second = results[1];
  if (firstSeed === null || secondSeed === null || !first || !second) return tournament;
  const winnerSeed = winningSeed(firstSeed, first, secondSeed, second);
  matches[tournament.currentMatchIndex] = { ...match, results, winnerSeed };
  if (match.advanceTo) {
    const target = matches[match.advanceTo.matchIndex];
    if (!target) return tournament;
    const playerSeeds: [number | null, number | null] = [...target.playerSeeds];
    playerSeeds[match.advanceTo.slot] = winnerSeed;
    matches[match.advanceTo.matchIndex] = { ...target, playerSeeds };
  }
  const final = tournament.currentMatchIndex === matches.length - 1;
  return {
    ...tournament,
    matches,
    phase: final ? 'finished' : 'turnComplete',
    currentGame: final ? null : game,
    finishedAt: final ? finishedAt : null,
  };
}

export function nextTurn(tournament: Tournament): Tournament {
  if (tournament.phase !== 'turnComplete' || tournament.currentTurn !== 0) return tournament;
  return { ...tournament, currentTurn: 1, phase: 'ready', currentGame: null };
}

export function nextMatch(tournament: Tournament): Tournament {
  if (tournament.phase !== 'turnComplete' || tournament.currentTurn !== 1) return tournament;
  const next = tournament.currentMatchIndex + 1;
  if (next >= tournament.matches.length) return tournament;
  return {
    ...tournament,
    currentMatchIndex: next,
    currentTurn: 0,
    phase: 'ready',
    currentGame: null,
  };
}

export function champion(tournament: Tournament): Entrant | null {
  if (tournament.phase !== 'finished') return null;
  const seed = tournament.matches.at(-1)?.winnerSeed;
  return tournament.players.find((player) => player.seed === seed) ?? null;
}

export function winningSeed(
  firstSeed: number,
  first: TournamentResult,
  secondSeed: number,
  second: TournamentResult,
): number {
  if (first.moves !== second.moves) return first.moves < second.moves ? firstSeed : secondSeed;
  if (first.elapsedMs !== second.elapsedMs)
    return first.elapsedMs < second.elapsedMs ? firstSeed : secondSeed;
  return Math.min(firstSeed, secondSeed);
}
