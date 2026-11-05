import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { decodeTournamentRecord } from './record-validation.ts';
import type {
  TournamentMatch,
  TournamentPlayer,
  TournamentRecord,
  TournamentResult,
} from './rules.ts';

const TOURNAMENT_FORMAT = 'neon-pairs/tournament-collection';
const TOURNAMENTS_KEY = 'np3:tournaments';
const MAX_TOURNAMENTS = 10;
const MAX_TOURNAMENT_JSON_BYTES = 262_144;
export const MAX_TOURNAMENT_JSON_CHARACTERS = 262_144;

interface TournamentHistoryRead {
  readonly tournaments: readonly TournamentRecord[];
  readonly unavailable: boolean;
}

function exportPlayer(player: TournamentPlayer) {
  return { name: player.name, seed: player.seed };
}

function exportResult(result: TournamentResult) {
  return { elapsedMs: result.elapsedMs, moves: result.moves };
}

function exportMatch(match: TournamentMatch) {
  const players = match.players;
  const results = match.results;
  if (
    players[0] === null ||
    players[1] === null ||
    !results[0] ||
    !results[1] ||
    match.winnerSeed === null
  )
    throw new Error('Only finished tournaments can be exported.');
  return {
    boardCode: match.boardCode,
    players: [players[0], players[1]],
    results: [exportResult(results[0]), exportResult(results[1])],
    round: match.round,
    winnerSeed: match.winnerSeed,
  };
}

function exportRecord(record: TournamentRecord) {
  return {
    championSeed: record.championSeed,
    matches: record.matches.map(exportMatch),
    players: record.players.map(exportPlayer),
  };
}

function validRecords(value: unknown): TournamentRecord[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const records = value.map(decodeTournamentRecord);
  return records.some((record) => record === null) ? null : (records as TournamentRecord[]);
}

function unknownKey(value: unknown, allowed: readonly string[]): string | null {
  if (!isJsonObject(value)) return null;
  return Object.keys(value).find((key) => !allowed.includes(key)) ?? null;
}

export function unknownTournamentField(text: string): string | null {
  if (!isWithinBytes(text, MAX_TOURNAMENT_JSON_BYTES)) return null;
  const value = parseJson(text);
  const rootUnknown = unknownKey(value, ['format', 'tournaments', 'version']);
  if (rootUnknown) return rootUnknown;
  if (!isJsonObject(value) || !Array.isArray(value.tournaments)) return null;
  for (const tournament of value.tournaments) {
    const recordUnknown = unknownKey(tournament, ['championSeed', 'matches', 'players']);
    if (recordUnknown) return recordUnknown;
    if (!isJsonObject(tournament)) continue;
    if (Array.isArray(tournament.players)) {
      for (const player of tournament.players) {
        const playerUnknown = unknownKey(player, ['name', 'seed']);
        if (playerUnknown) return playerUnknown;
      }
    }
    if (Array.isArray(tournament.matches)) {
      for (const match of tournament.matches) {
        const matchUnknown = unknownKey(match, [
          'boardCode',
          'players',
          'results',
          'round',
          'winnerSeed',
        ]);
        if (matchUnknown) return matchUnknown;
        if (!isJsonObject(match) || !Array.isArray(match.results)) continue;
        for (const result of match.results) {
          const resultUnknown = unknownKey(result, ['elapsedMs', 'moves']);
          if (resultUnknown) return resultUnknown;
        }
      }
    }
  }
  return null;
}

export function encodeTournamentCollection(tournaments: readonly TournamentRecord[]): string {
  return JSON.stringify(
    {
      format: TOURNAMENT_FORMAT,
      tournaments: tournaments.map(exportRecord),
      version: 1,
    },
    null,
    2,
  );
}

export function decodeTournamentCollection(text: string): readonly TournamentRecord[] | null {
  if (!isWithinBytes(text, MAX_TOURNAMENT_JSON_BYTES)) return null;
  const value = parseJson(text);
  if (!isJsonObject(value) || !hasExactKeys(value, ['format', 'tournaments', 'version']))
    return null;
  if (value.format !== TOURNAMENT_FORMAT || value.version !== 1) return null;
  return validRecords(value.tournaments);
}

export function readTournamentHistory(): TournamentHistoryRead {
  let text: string | null;
  try {
    text = window.localStorage.getItem(TOURNAMENTS_KEY);
  } catch {
    return { tournaments: [], unavailable: true };
  }
  if (!text || !isWithinBytes(text, MAX_TOURNAMENT_JSON_BYTES))
    return { tournaments: [], unavailable: false };
  const value = parseJson(text);
  if (!isJsonObject(value) || !hasExactKeys(value, ['v', 'items']) || value.v !== 3) {
    return { tournaments: [], unavailable: false };
  }
  const tournaments = validRecords(value.items);
  if (!tournaments || tournaments.length > MAX_TOURNAMENTS)
    return { tournaments: [], unavailable: false };
  return { tournaments, unavailable: false };
}

export function writeTournamentHistory(tournaments: readonly TournamentRecord[]): boolean {
  try {
    window.localStorage.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({ v: 3, items: tournaments.map(exportRecord) }),
    );
    return true;
  } catch {
    return false;
  }
}

export function tournamentIdentity(record: TournamentRecord): string {
  return JSON.stringify({
    championSeed: record.championSeed,
    matches: record.matches.map((match) => ({
      boardCode: match.boardCode,
      players: match.players,
      results: match.results,
      round: match.round,
      winnerSeed: match.winnerSeed,
    })),
    players: record.players,
  });
}

export function retainRecentTournaments(
  tournaments: readonly TournamentRecord[],
): TournamentRecord[] {
  const unique = new Map<string, TournamentRecord>();
  for (const tournament of tournaments) {
    const identity = tournamentIdentity(tournament);
    if (!unique.has(identity)) unique.set(identity, tournament);
  }
  return [...unique.values()].slice(0, MAX_TOURNAMENTS);
}
