import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { normalizePlayerName } from './names.ts';
import { roundDefinitions } from './layout.ts';
import { winnerForMatch } from './rules.ts';
import { validateTournamentBracket } from './validate-bracket.ts';
import type {
  RoundName,
  Tournament,
  TournamentMatch,
  TournamentPlayer,
  TournamentResult,
  TournamentRound,
  TournamentStatus,
} from './model.ts';

export interface TournamentReadResult {
  readonly error: string | null;
  readonly tournament: Tournament | null;
}

function invalid(message = 'Invalid tournament JSON.'): never {
  throw new Error(message);
}

function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isJsonObject(value)) return invalid();
  for (const key of Object.keys(value))
    if (!keys.includes(key)) return invalid(`Unknown field: ${key}.`);
  if (!hasExactKeys(value, keys)) return invalid();
  return value;
}

function readPlayer(value: unknown): TournamentPlayer | null {
  if (value === null) return null;
  const player = object(value, ['name', 'seed']);
  if (typeof player.name !== 'string' || !isNonnegativeSafeInteger(player.seed)) return invalid();
  const name = normalizePlayerName(player.name);
  if (name !== player.name || Array.from(name).length < 2 || Array.from(name).length > 20)
    return invalid();
  return { name, seed: player.seed };
}

function readPlayerPair(
  value: unknown,
): readonly [TournamentPlayer | null, TournamentPlayer | null] {
  if (!Array.isArray(value) || value.length !== 2) return invalid();
  return [readPlayer(value[0]), readPlayer(value[1])];
}

function readResult(value: unknown): TournamentResult | null {
  if (value === null) return null;
  const result = object(value, ['elapsedMs', 'moves']);
  if (!isNonnegativeSafeInteger(result.moves) || typeof result.elapsedMs !== 'number')
    return invalid();
  if (
    !Number.isFinite(result.elapsedMs) ||
    result.elapsedMs < 0 ||
    result.elapsedMs > ELAPSED_MAX_MS
  )
    return invalid();
  return { elapsedMs: result.elapsedMs, moves: result.moves };
}

function readResultPair(
  value: unknown,
): readonly [TournamentResult | null, TournamentResult | null] {
  if (!Array.isArray(value) || value.length !== 2) return invalid();
  return [readResult(value[0]), readResult(value[1])];
}

function samePlayer(first: TournamentPlayer | null, second: TournamentPlayer | null): boolean {
  return first?.name === second?.name && first?.seed === second?.seed;
}

function readMatch(value: unknown, name: RoundName, size: number, index: number): TournamentMatch {
  const match = object(value, ['boardCode', 'id', 'players', 'results', 'winner']);
  if (typeof match.boardCode !== 'string' || typeof match.id !== 'string') return invalid();
  const parsedCode = parseBoardCode(match.boardCode);
  const prefix = name === 'Quarterfinal' ? 'QF' : name === 'Semifinal' ? 'SF' : 'F';
  if (!parsedCode || parsedCode.size !== size || match.id !== `${prefix}${index + 1}`)
    return invalid();
  const players = readPlayerPair(match.players);
  const results = readResultPair(match.results);
  const winner = readPlayer(match.winner);
  if (players.some((player, playerIndex) => !player && results[playerIndex])) return invalid();
  for (const result of results)
    if (result && (result.moves < size ** 2 / 2 || result.moves > MOVES_MAX)) return invalid();
  const expectedWinner = winnerForMatch(players, results);
  if (!samePlayer(winner, expectedWinner)) return invalid();
  return { boardCode: match.boardCode, id: match.id, players, results, winner };
}

function readRound(value: unknown, name: RoundName, size: number, count: number): TournamentRound {
  const round = object(value, ['matches', 'name', 'size']);
  if (round.name !== name || round.size !== size || !Array.isArray(round.matches)) return invalid();
  if (round.matches.length !== count) return invalid();
  return {
    matches: round.matches.map((match, index) => readMatch(match, name, size, index)),
    name,
    size,
  };
}

function readTournament(value: unknown): Tournament {
  const record = object(value, [
    'champion',
    'id',
    'matchIndex',
    'playerCount',
    'playerIndex',
    'players',
    'roundIndex',
    'rounds',
    'status',
  ]);
  const playerCountValue = record.playerCount;
  if (playerCountValue !== 4 && playerCountValue !== 8) return invalid();
  const playerCount = playerCountValue;
  if (typeof record.id !== 'string' || !Array.isArray(record.players)) return invalid();
  const roundIndex = record.roundIndex;
  const matchIndex = record.matchIndex;
  const playerIndex = record.playerIndex;
  const statusValue = record.status;
  if (!isNonnegativeSafeInteger(roundIndex) || !isNonnegativeSafeInteger(matchIndex))
    return invalid();
  if (playerIndex !== 0 && playerIndex !== 1) return invalid();
  if (statusValue !== 'active' && statusValue !== 'finished') return invalid();
  const status: TournamentStatus = statusValue;
  if (!Array.isArray(record.rounds)) return invalid();
  const players = record.players.map(readPlayer);
  if (players.length !== playerCount || players.some((player) => !player)) return invalid();
  const entrants = players.filter((player): player is TournamentPlayer => player !== null);
  if (entrants.some((player, index) => player.seed !== index + 1)) return invalid();
  if (new Set(entrants.map((player) => player.name.toLowerCase())).size !== playerCount)
    return invalid();
  const definitions = roundDefinitions(playerCount);
  if (record.rounds.length !== definitions.length) return invalid();
  const rounds = definitions.map((definition, index) =>
    readRound(record.rounds[index], definition.name, definition.size, definition.count),
  );
  const tournament: Tournament = {
    champion: readPlayer(record.champion),
    id: record.id,
    matchIndex,
    playerCount,
    playerIndex,
    players: entrants,
    roundIndex,
    rounds,
    status,
  };
  validateTournamentBracket(tournament);
  return tournament;
}

export function decodeTournamentRecord(value: unknown): TournamentReadResult {
  try {
    return { error: null, tournament: readTournament(value) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Invalid tournament JSON.',
      tournament: null,
    };
  }
}
