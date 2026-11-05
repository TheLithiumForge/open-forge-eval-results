import { parseBoardCode } from './deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from './game.ts';
import type { GameState } from './game.ts';

export interface TournamentPlayer {
  readonly id: number;
  readonly name: string;
}

interface TournamentResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface TournamentMatch {
  readonly players: readonly [number | null, number | null];
  readonly boardCode: string;
  readonly results: readonly [TournamentResult | null, TournamentResult | null];
  readonly winnerId: number | null;
}

export interface Tournament {
  readonly id: string;
  readonly size: number;
  readonly players: readonly TournamentPlayer[];
  readonly rounds: readonly (readonly TournamentMatch[])[];
  readonly currentRound: number;
  readonly currentMatch: number;
  readonly turn: 0 | 1;
  readonly status: 'active' | 'complete';
  readonly championId: number | null;
  readonly createdAt: number;
  readonly completedAt: number | null;
}

export interface TournamentDraft {
  readonly playerCount: 4 | 8;
  readonly names: readonly string[];
}

export function currentTournamentMatch(tournament: Tournament): TournamentMatch {
  const round = tournament.rounds[tournament.currentRound];
  const match = round?.[tournament.currentMatch];
  if (!match) throw new Error('Tournament match is missing.');
  return match;
}

export function createTournament(
  names: readonly string[],
  size: number,
  id: string,
  createdAt: number,
  nextBoardCode: (size: number, previousSeed?: number) => string,
): Tournament {
  const players = names.map((name, playerId) => ({ id: playerId, name }));
  const rounds: TournamentMatch[][] = [];
  let previousSeed: number | undefined;
  for (let matchCount = names.length / 2; matchCount >= 1; matchCount /= 2) {
    const matches: TournamentMatch[] = [];
    for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
      const boardCode = nextBoardCode(size, previousSeed);
      previousSeed = parseBoardCode(boardCode)?.seed;
      const firstPlayer = rounds.length === 0 ? matchIndex * 2 : null;
      const secondPlayer = rounds.length === 0 ? matchIndex * 2 + 1 : null;
      matches.push({
        players: [firstPlayer, secondPlayer],
        boardCode,
        results: [null, null],
        winnerId: null,
      });
    }
    rounds.push(matches);
  }
  return {
    id,
    size,
    players,
    rounds,
    currentRound: 0,
    currentMatch: 0,
    turn: 0,
    status: 'active',
    championId: null,
    createdAt,
    completedAt: null,
  };
}

export function recordTournamentResult(
  tournament: Tournament,
  result: TournamentResult,
): Tournament {
  const match = currentTournamentMatch(tournament);
  if (tournament.status !== 'active' || match.results[tournament.turn]) return tournament;
  const results: [TournamentResult | null, TournamentResult | null] = [...match.results];
  results[tournament.turn] = result;
  return replaceCurrentMatch(tournament, { ...match, results });
}

export function advanceTournamentTurn(tournament: Tournament): Tournament {
  const match = currentTournamentMatch(tournament);
  if (tournament.status !== 'active' || tournament.turn !== 0 || !match.results[0])
    return tournament;
  return { ...tournament, turn: 1 };
}

export function advanceTournament(tournament: Tournament, completedAt: number): Tournament {
  const match = currentTournamentMatch(tournament);
  const first = match.players[0];
  const second = match.players[1];
  const firstResult = match.results[0];
  const secondResult = match.results[1];
  if (
    tournament.status !== 'active' ||
    first === null ||
    second === null ||
    !firstResult ||
    !secondResult
  )
    return tournament;
  const winnerId =
    firstResult.moves < secondResult.moves
      ? first
      : secondResult.moves < firstResult.moves
        ? second
        : firstResult.elapsedMs <= secondResult.elapsedMs
          ? first
          : second;
  const rounds = tournament.rounds.map((round) => [...round]);
  const currentRound = rounds[tournament.currentRound];
  if (!currentRound) return tournament;
  currentRound[tournament.currentMatch] = { ...match, winnerId };
  if (tournament.currentRound === rounds.length - 1) {
    return {
      ...tournament,
      rounds,
      status: 'complete',
      championId: winnerId,
      completedAt,
    };
  }
  const nextRound = rounds[tournament.currentRound + 1];
  const feeder = nextRound?.[Math.floor(tournament.currentMatch / 2)];
  if (!nextRound || !feeder) return tournament;
  const nextPlayers: [number | null, number | null] = [...feeder.players];
  nextPlayers[tournament.currentMatch % 2] = winnerId;
  nextRound[Math.floor(tournament.currentMatch / 2)] = { ...feeder, players: nextPlayers };
  const isLastMatch = tournament.currentMatch === currentRound.length - 1;
  return {
    ...tournament,
    rounds,
    currentRound: isLastMatch ? tournament.currentRound + 1 : tournament.currentRound,
    currentMatch: isLastMatch ? 0 : tournament.currentMatch + 1,
    turn: 0,
  };
}

export function resultForGame(game: GameState): TournamentResult {
  return { moves: game.moves, elapsedMs: game.elapsedMs };
}

export function isValidTournamentResult(value: unknown, size: number): value is TournamentResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 2 &&
    Object.hasOwn(value, 'moves') &&
    Object.hasOwn(value, 'elapsedMs') &&
    Number.isSafeInteger(Reflect.get(value, 'moves')) &&
    Number(Reflect.get(value, 'moves')) >= size ** 2 / 2 &&
    Number(Reflect.get(value, 'moves')) <= MOVES_MAX &&
    Number.isFinite(Reflect.get(value, 'elapsedMs')) &&
    Number(Reflect.get(value, 'elapsedMs')) >= 0 &&
    Number(Reflect.get(value, 'elapsedMs')) <= ELAPSED_MAX_MS
  );
}

function replaceCurrentMatch(tournament: Tournament, match: TournamentMatch): Tournament {
  const rounds = tournament.rounds.map((round) => [...round]);
  const round = rounds[tournament.currentRound];
  if (!round) return tournament;
  round[tournament.currentMatch] = match;
  return { ...tournament, rounds };
}
