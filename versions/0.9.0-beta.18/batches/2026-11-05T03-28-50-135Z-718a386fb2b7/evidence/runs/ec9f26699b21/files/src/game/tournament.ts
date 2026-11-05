import { isValidSize, parseBoardCode } from './deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from './game.ts';
import { decodeSnapshot } from './snapshot.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from './saved-format.ts';

export const TOURNAMENT_VERSION = 1;
export const TOURNAMENT_MAX_BYTES = 100_000;
export const PLAYER_NAME_MAX = 40;

export interface PlayerResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface TournamentMatch {
  readonly id: string;
  readonly round: number;
  readonly number: number;
  readonly players: readonly [string | null, string | null];
  readonly results: readonly [PlayerResult | null, PlayerResult | null];
  readonly winner: string | null;
  readonly boardCode: string | null;
  readonly status: 'pending' | 'active' | 'complete';
}

export type TournamentTurnState = 'ready' | 'playing' | 'turn-over' | 'match-over' | 'complete';

export interface Tournament {
  readonly version: typeof TOURNAMENT_VERSION;
  readonly playerCount: 4 | 8;
  readonly boardSize: number;
  readonly players: readonly string[];
  readonly createdAt: string;
  readonly phase: 'active' | 'complete';
  readonly matches: readonly TournamentMatch[];
  readonly currentMatchId: string | null;
  readonly turnIndex: 0 | 1;
  readonly turnState: TournamentTurnState;
  readonly champion: string | null;
}

export interface TournamentFile {
  readonly tournament: Tournament;
  readonly gameSnapshot: string | null;
}

export interface TournamentSetup {
  readonly playerCount: PlayerCount;
  readonly names: readonly string[];
}

type PlayerCount = 4 | 8;

export function createTournament(
  playerCount: PlayerCount,
  names: readonly string[],
  boardSize: number,
  boardCode: string,
): Tournament | null {
  if (
    (playerCount !== 4 && playerCount !== 8) ||
    names.length < playerCount ||
    !isValidSize(boardSize) ||
    parseBoardCode(boardCode)?.size !== boardSize
  )
    return null;
  const players = names.slice(0, playerCount).map((name) => name.trim());
  if (!validNames(players)) return null;
  const matches: TournamentMatch[] = [];
  const rounds = Math.log2(playerCount);
  for (let round = 1; round <= rounds; round += 1) {
    const count = playerCount / 2 ** round;
    for (let number = 1; number <= count; number += 1) {
      const index = matches.length;
      const firstRound = round === 1;
      const firstPlayer = firstRound ? (players[(number - 1) * 2] ?? null) : null;
      const secondPlayer = firstRound ? (players[(number - 1) * 2 + 1] ?? null) : null;
      matches.push({
        id: matchId(round, number),
        round,
        number,
        players: [firstPlayer, secondPlayer],
        results: [null, null],
        winner: null,
        boardCode: index === 0 ? boardCode : null,
        status: index === 0 ? 'active' : 'pending',
      });
    }
  }
  return {
    version: TOURNAMENT_VERSION,
    playerCount,
    boardSize,
    players,
    createdAt: new Date().toISOString(),
    phase: 'active',
    matches,
    currentMatchId: matchId(1, 1),
    turnIndex: 0,
    turnState: 'ready',
    champion: null,
  };
}

export function startTournamentTurn(tournament: Tournament): Tournament {
  if (tournament.phase !== 'active' || tournament.turnState !== 'ready') return tournament;
  return { ...tournament, turnState: 'playing' };
}

export function recordTournamentTurn(tournament: Tournament, result: PlayerResult): Tournament {
  const matchIndex = tournament.matches.findIndex(
    (match) => match.id === tournament.currentMatchId,
  );
  const match = tournament.matches[matchIndex];
  if (
    tournament.phase !== 'active' ||
    tournament.turnState !== 'playing' ||
    !match ||
    match.status !== 'active' ||
    match.results[tournament.turnIndex] !== null ||
    !validResult(result, tournament.boardSize)
  )
    return tournament;

  const results: [PlayerResult | null, PlayerResult | null] = [...match.results];
  results[tournament.turnIndex] = result;
  if (tournament.turnIndex === 0) {
    const matches = [...tournament.matches];
    matches[matchIndex] = { ...match, results };
    return { ...tournament, matches, turnIndex: 1, turnState: 'turn-over' };
  }

  const left = results[0];
  const right = results[1];
  const firstPlayer = match.players[0];
  const secondPlayer = match.players[1];
  if (!left || !right || !firstPlayer || !secondPlayer) return tournament;
  // Fewer moves wins. Equal move counts use elapsed time; an exact tie advances the first player.
  const winner =
    left.moves < right.moves || (left.moves === right.moves && left.elapsedMs <= right.elapsedMs)
      ? firstPlayer
      : secondPlayer;
  const matches = [...tournament.matches];
  matches[matchIndex] = { ...match, results, winner, status: 'complete' };
  const nextRound = match.round + 1;
  const nextNumber = Math.ceil(match.number / 2);
  const nextIndex = matches.findIndex((item) => item.id === matchId(nextRound, nextNumber));
  if (nextIndex >= 0) {
    const nextMatch = matches[nextIndex];
    if (nextMatch) {
      const slot = match.number % 2 === 1 ? 0 : 1;
      const players: [string | null, string | null] = [...nextMatch.players];
      players[slot] = winner;
      matches[nextIndex] = { ...nextMatch, players };
    }
  }
  return { ...tournament, matches, turnState: 'match-over' };
}

export function advanceTournamentTurn(tournament: Tournament): Tournament {
  if (tournament.phase !== 'active' || tournament.turnState !== 'turn-over') return tournament;
  const match = tournament.matches.find((item) => item.id === tournament.currentMatchId);
  if (!match || match.results[0] === null) return tournament;
  return { ...tournament, turnState: 'ready' };
}

export function advanceTournamentMatch(tournament: Tournament, nextBoardCode: string): Tournament {
  if (tournament.phase !== 'active' || tournament.turnState !== 'match-over') return tournament;
  const current = tournament.matches.find((match) => match.id === tournament.currentMatchId);
  if (!current?.winner) return tournament;
  if (current.round === Math.log2(tournament.playerCount)) {
    return {
      ...tournament,
      phase: 'complete',
      currentMatchId: null,
      turnState: 'complete',
      champion: current.winner,
    };
  }
  const next = tournament.matches.find(
    (match) => match.status === 'pending' && match.players[0] !== null && match.players[1] !== null,
  );
  if (!next || parseBoardCode(nextBoardCode)?.size !== tournament.boardSize) return tournament;
  const matches = tournament.matches.map((match) =>
    match.id === next.id
      ? { ...match, status: 'active' as const, boardCode: nextBoardCode }
      : match,
  );
  return {
    ...tournament,
    matches,
    currentMatchId: next.id,
    turnIndex: 0,
    turnState: 'ready',
  };
}

export function encodeTournamentFile(tournament: Tournament, gameSnapshot: string | null): string {
  return JSON.stringify({ version: TOURNAMENT_VERSION, tournament, gameSnapshot }, null, 2);
}

export function encodeTournamentSetup(playerCount: PlayerCount, names: readonly string[]): string {
  return JSON.stringify(
    { version: TOURNAMENT_VERSION, kind: 'setup', playerCount, names },
    null,
    2,
  );
}

export function decodeTournamentSetup(text: string): TournamentSetup | null {
  const value = isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? parseJson(text) : undefined;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['version', 'kind', 'playerCount', 'names']) ||
    value.version !== TOURNAMENT_VERSION ||
    value.kind !== 'setup' ||
    (value.playerCount !== 4 && value.playerCount !== 8) ||
    !Array.isArray(value.names) ||
    value.names.length !== 8 ||
    !value.names.every((name) => typeof name === 'string' && name.length <= PLAYER_NAME_MAX)
  )
    return null;
  return { playerCount: value.playerCount, names: value.names };
}

export function decodeTournamentFile(text: string): TournamentFile | null {
  const value = isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? parseJson(text) : undefined;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['version', 'tournament', 'gameSnapshot']) ||
    value.version !== TOURNAMENT_VERSION ||
    !(value.gameSnapshot === null || typeof value.gameSnapshot === 'string')
  )
    return null;
  const tournament = decodeTournament(value.tournament);
  if (!tournament) return null;
  if (value.gameSnapshot !== null) {
    const game = decodeSnapshot(value.gameSnapshot);
    const match = tournament.matches.find((item) => item.id === tournament.currentMatchId);
    if (!game || !match || game.boardCode !== match.boardCode) return null;
  }
  return { tournament, gameSnapshot: value.gameSnapshot };
}

export function decodeTournament(value: unknown): Tournament | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, [
      'version',
      'playerCount',
      'boardSize',
      'players',
      'createdAt',
      'phase',
      'matches',
      'currentMatchId',
      'turnIndex',
      'turnState',
      'champion',
    ]) ||
    value.version !== TOURNAMENT_VERSION ||
    (value.playerCount !== 4 && value.playerCount !== 8) ||
    typeof value.boardSize !== 'number' ||
    !isValidSize(value.boardSize) ||
    typeof value.createdAt !== 'string' ||
    value.createdAt.length > 40 ||
    (value.phase !== 'active' && value.phase !== 'complete') ||
    !Array.isArray(value.players) ||
    !validNames(value.players) ||
    value.players.length !== value.playerCount ||
    !Array.isArray(value.matches) ||
    !isNonnegativeSafeInteger(value.turnIndex) ||
    value.turnIndex > 1 ||
    !isTurnState(value.turnState) ||
    !(value.currentMatchId === null || typeof value.currentMatchId === 'string') ||
    !(value.champion === null || typeof value.champion === 'string')
  )
    return null;

  const matches: TournamentMatch[] = [];
  const rounds = Math.log2(value.playerCount);
  if (value.matches.length !== value.playerCount - 1) return null;
  for (let round = 1; round <= rounds; round += 1) {
    const count = value.playerCount / 2 ** round;
    for (let number = 1; number <= count; number += 1) {
      const index = matches.length;
      const parsed = decodeMatch(value.matches[index], round, number, value.boardSize);
      if (!parsed) return null;
      matches.push(parsed);
    }
  }
  const tournament: Tournament = {
    version: TOURNAMENT_VERSION,
    playerCount: value.playerCount,
    boardSize: value.boardSize,
    players: value.players,
    createdAt: value.createdAt,
    phase: value.phase,
    matches,
    currentMatchId: value.currentMatchId,
    turnIndex: value.turnIndex as 0 | 1,
    turnState: value.turnState,
    champion: value.champion,
  };
  return validTournamentState(tournament) ? tournament : null;
}

export function validateNames(names: readonly string[], count: number): boolean {
  return (
    (count === 4 || count === 8) && validNames(names.slice(0, count).map((name) => name.trim()))
  );
}

export function activeTournamentMatch(tournament: Tournament): TournamentMatch | null {
  return tournament.matches.find((match) => match.id === tournament.currentMatchId) ?? null;
}

export function nextPlayerName(tournament: Tournament): string | null {
  return activeTournamentMatch(tournament)?.players[tournament.turnIndex] ?? null;
}

export function matchPlaceholder(match: TournamentMatch, slot: 0 | 1): string {
  const player = match.players[slot];
  if (player) return player;
  if (match.round === 1) return 'TBD';
  const sourceNumber = (match.number - 1) * 2 + slot + 1;
  return `Winner of match ${match.round - 1}.${sourceNumber}`;
}

function decodeMatch(
  value: unknown,
  round: number,
  number: number,
  boardSize: number,
): TournamentMatch | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, [
      'id',
      'round',
      'number',
      'players',
      'results',
      'winner',
      'boardCode',
      'status',
    ]) ||
    value.id !== matchId(round, number) ||
    value.round !== round ||
    value.number !== number ||
    !Array.isArray(value.players) ||
    value.players.length !== 2 ||
    !value.players.every((player) => player === null || typeof player === 'string') ||
    !Array.isArray(value.results) ||
    value.results.length !== 2 ||
    !(value.winner === null || typeof value.winner === 'string') ||
    !(value.boardCode === null || typeof value.boardCode === 'string') ||
    (value.status !== 'pending' && value.status !== 'active' && value.status !== 'complete')
  )
    return null;
  const players = value.players as [string | null, string | null];
  const results: [PlayerResult | null, PlayerResult | null] = [
    decodeResult(value.results[0], boardSize),
    decodeResult(value.results[1], boardSize),
  ];
  if (
    (value.results[0] !== null && !results[0]) ||
    (value.results[1] !== null && !results[1]) ||
    players.some(
      (player) => player !== null && (!player.trim() || player.length > PLAYER_NAME_MAX),
    ) ||
    (value.boardCode !== null && parseBoardCode(value.boardCode)?.size !== boardSize)
  )
    return null;
  return {
    id: value.id,
    round,
    number,
    players,
    results,
    winner: value.winner,
    boardCode: value.boardCode,
    status: value.status,
  };
}

function decodeResult(value: unknown, boardSize: number): PlayerResult | null {
  if (value === null) return null;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['moves', 'elapsedMs']) ||
    !isNonnegativeSafeInteger(value.moves) ||
    value.moves < boardSize ** 2 / 2 ||
    value.moves > MOVES_MAX ||
    !isNonnegativeSafeInteger(value.elapsedMs) ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return null;
  return { moves: value.moves, elapsedMs: value.elapsedMs };
}

function validResult(result: PlayerResult, boardSize: number): boolean {
  return (
    Number.isSafeInteger(result.moves) &&
    result.moves >= boardSize ** 2 / 2 &&
    result.moves <= MOVES_MAX &&
    Number.isSafeInteger(result.elapsedMs) &&
    result.elapsedMs >= 0 &&
    result.elapsedMs <= ELAPSED_MAX_MS
  );
}

function validTournamentState(tournament: Tournament): boolean {
  const { matches, playerCount, phase, turnState, currentMatchId, turnIndex } = tournament;
  for (const match of matches) {
    if (match.round === 1) {
      const first = tournament.players[(match.number - 1) * 2];
      const second = tournament.players[(match.number - 1) * 2 + 1];
      if (match.players[0] !== first || match.players[1] !== second) return false;
    } else {
      const sourceNumber = (match.number - 1) * 2 + 1;
      const sourceA = matches.find((item) => item.id === matchId(match.round - 1, sourceNumber));
      const sourceB = matches.find(
        (item) => item.id === matchId(match.round - 1, sourceNumber + 1),
      );
      if (!sourceA || !sourceB) return false;
      if (match.players[0] !== (sourceA.status === 'complete' ? sourceA.winner : null))
        return false;
      if (match.players[1] !== (sourceB.status === 'complete' ? sourceB.winner : null))
        return false;
    }
    if (match.status === 'pending') {
      if (
        match.winner !== null ||
        match.boardCode !== null ||
        match.results.some((result) => result !== null)
      )
        return false;
      if (match.players[0] === null || match.players[1] === null) {
        // A future bracket match can be waiting for a previous winner.
        if (match.round === 1) return false;
      }
    } else if (match.status === 'active') {
      if (
        match.winner !== null ||
        !match.boardCode ||
        match.players.some((player) => player === null)
      )
        return false;
    } else if (
      match.winner === null ||
      !match.boardCode ||
      match.players.some((player) => player === null) ||
      match.results.some((result) => result === null) ||
      !match.players.includes(match.winner)
    ) {
      return false;
    }
  }
  const activeMatches = matches.filter((match) => match.status === 'active');
  if (phase === 'active') {
    if (!currentMatchId || tournament.champion !== null) return false;
    const current = matches.find((match) => match.id === currentMatchId);
    if (!current) return false;
    if (turnState === 'complete' || current.round > Math.log2(playerCount)) return false;
    if (turnState === 'match-over') {
      return (
        activeMatches.length === 0 &&
        current.status === 'complete' &&
        turnIndex === 1 &&
        current.results.every((result) => result !== null)
      );
    }
    if (activeMatches.length !== 1 || activeMatches[0]?.id !== currentMatchId) return false;
    if (turnState === 'turn-over') {
      return turnIndex === 1 && current.results[0] !== null && current.results[1] === null;
    }
    if (turnState === 'ready' || turnState === 'playing') {
      return (
        current.status === 'active' &&
        current.results[turnIndex] === null &&
        (turnIndex === 0 ? current.results[0] === null : current.results[0] !== null)
      );
    }
    return false;
  }
  const final = matches.find((match) => match.id === matchId(Math.log2(playerCount), 1));
  return (
    !currentMatchId &&
    activeMatches.length === 0 &&
    matches.every((match) => match.status === 'complete') &&
    turnState === 'complete' &&
    turnIndex === 1 &&
    tournament.champion !== null &&
    tournament.champion === final?.winner
  );
}

function validNames(names: readonly unknown[]): names is readonly string[] {
  if (
    names.length < 4 ||
    names.length > 8 ||
    !names.every(
      (name) =>
        typeof name === 'string' &&
        name.length <= PLAYER_NAME_MAX &&
        name.trim().length > 0 &&
        name === name.trim(),
    )
  )
    return false;
  const normalized = names.map((name) => (name as string).toLocaleLowerCase());
  return new Set(normalized).size === names.length;
}

function isTurnState(value: unknown): value is TournamentTurnState {
  return (
    value === 'ready' ||
    value === 'playing' ||
    value === 'turn-over' ||
    value === 'match-over' ||
    value === 'complete'
  );
}

function matchId(round: number, number: number): string {
  return `r${round}m${number}`;
}
