import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { TOURNAMENT_FORMAT, TOURNAMENT_VERSION } from './format-identity.ts';
import { normalizeName } from './rules.ts';
import { isValidTournament } from './validation.ts';
import type { TournamentMatch, TournamentResult, TournamentRound } from './pairing.ts';
import type { Tournament, TournamentPlayer } from './types.ts';

const PLAYER_KEYS = ['name', 'seed'];
const RESULT_KEYS = ['elapsedMs', 'moves'];
const MATCH_KEYS = ['boardCode', 'players', 'results', 'round', 'winner'];
const STATE_KEYS = [
  'champion',
  'currentMatch',
  'currentTurn',
  'game',
  'matches',
  'playerCount',
  'players',
];
const ROOT_KEYS = ['format', 'tournament', 'version'];

export function decodeTournamentValue(value: unknown): Tournament | null {
  if (!isJsonObject(value) || !hasExactKeys(value, ROOT_KEYS)) return null;
  if (value.format !== TOURNAMENT_FORMAT || value.version !== TOURNAMENT_VERSION) return null;
  const data = value.tournament;
  if (!isJsonObject(data) || !hasExactKeys(data, STATE_KEYS)) return null;
  const count = data.playerCount;
  if ((count !== 4 && count !== 8) || !Array.isArray(data.players) || data.players.length !== count)
    return null;
  const players = readPlayers(data.players);
  if (!players || new Set(players.map((player) => player.name.toLowerCase())).size !== count)
    return null;
  if (!Array.isArray(data.matches)) return null;
  const matches = readMatches(data.matches);
  if (!matches) return null;
  const champion = readOptionalPlayer(data.champion);
  const game = readGame(data.game);
  if (champion === undefined || game === undefined) return null;
  if (
    !isNonnegativeSafeInteger(data.currentMatch) ||
    (data.currentTurn !== 0 && data.currentTurn !== 1)
  )
    return null;
  const tournament: Tournament = {
    champion,
    currentMatch: data.currentMatch,
    currentTurn: data.currentTurn,
    game,
    matches,
    playerCount: count,
    players,
  };
  return isValidTournament(tournament) ? tournament : null;
}

function readPlayers(values: unknown[]): TournamentPlayer[] | null {
  const players: TournamentPlayer[] = [];
  for (const [index, value] of values.entries()) {
    const player = readPlayer(value);
    if (!player || player.seed !== index + 1) return null;
    players.push(player);
  }
  return players;
}

function readPlayer(value: unknown): TournamentPlayer | null {
  if (!isJsonObject(value) || !hasExactKeys(value, PLAYER_KEYS)) return null;
  if (typeof value.name !== 'string' || !isNonnegativeSafeInteger(value.seed)) return null;
  const name = value.name;
  return name === normalizeName(name) && [...name].length >= 2 && [...name].length <= 20
    ? { name, seed: value.seed }
    : null;
}

function readOptionalPlayer(value: unknown): TournamentPlayer | null | undefined {
  if (value === null) return null;
  return readPlayer(value) ?? undefined;
}

function readResult(value: unknown): TournamentResult | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value) || !hasExactKeys(value, RESULT_KEYS)) return undefined;
  if (
    !isNonnegativeSafeInteger(value.moves) ||
    value.moves > MOVES_MAX ||
    typeof value.elapsedMs !== 'number' ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return undefined;
  return { elapsedMs: value.elapsedMs, moves: value.moves };
}

function readMatches(values: unknown[]): TournamentMatch[] | null {
  const matches: TournamentMatch[] = [];
  for (const value of values) {
    const match = readMatch(value);
    if (!match) return null;
    matches.push(match);
  }
  return matches;
}

function readMatch(value: unknown): TournamentMatch | null {
  if (!isJsonObject(value) || !hasExactKeys(value, MATCH_KEYS)) return null;
  const round = readRound(value.round);
  if (typeof value.boardCode !== 'string' || !round) return null;
  if (!Array.isArray(value.players) || value.players.length !== 2) return null;
  if (!Array.isArray(value.results) || value.results.length !== 2) return null;
  const first = readOptionalPlayer(value.players[0]);
  const second = readOptionalPlayer(value.players[1]);
  const firstResult = readResult(value.results[0]);
  const secondResult = readResult(value.results[1]);
  const winner = readOptionalPlayer(value.winner);
  if (
    first === undefined ||
    second === undefined ||
    firstResult === undefined ||
    secondResult === undefined ||
    winner === undefined
  )
    return null;
  return {
    boardCode: value.boardCode,
    players: [first, second],
    results: [firstResult, secondResult],
    round,
    winner,
  };
}

function readRound(value: unknown): TournamentRound | null {
  if (value === 'Quarterfinal' || value === 'Semifinal' || value === 'Final') return value;
  return null;
}

function readGame(value: unknown): Tournament['game'] | undefined {
  if (value === null) return null;
  if (!isJsonObject(value)) return undefined;
  return decodeSnapshot(JSON.stringify(value)) ?? undefined;
}
