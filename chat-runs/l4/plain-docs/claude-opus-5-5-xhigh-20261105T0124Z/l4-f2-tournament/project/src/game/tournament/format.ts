import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { isValidTournament } from './rules.ts';
import type { Attempt, Match, Tournament } from './rules.ts';

export const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
export const TOURNAMENT_VERSION = 1;
export const TOURNAMENT_MAX_BYTES = 65_536;
const ROOT_KEYS = ['format', 'matches', 'players', 'version'];
const RECORD_KEYS = ['matches', 'players'];
const MATCH_KEYS = ['attempts', 'boardCode'];
const ATTEMPT_KEYS = ['elapsedMs', 'moves'];
// The fields each list of objects holds, so a field check can look inside them.
const LIST_KEYS: Readonly<Record<string, readonly string[]>> = {
  matches: MATCH_KEYS,
  attempts: ATTEMPT_KEYS,
};
export const TournamentNotice = {
  invalid: 'Invalid tournament.',
  loadedCompleted: 'Loaded completed tournament.',
} as const;

type TournamentRead = { readonly tournament: Tournament } | { readonly notice: string };

// Keys stay in alphabetical order at every level. Elapsed time keeps the game's own precision,
// so a loaded tie compares the same values the players produced.
export function tournamentRecord(tournament: Tournament) {
  return {
    matches: tournament.matches.map((match) => ({
      attempts: match.attempts.map((attempt) => ({
        elapsedMs: attempt.elapsedMs,
        moves: attempt.moves,
      })),
      boardCode: match.boardCode,
    })),
    players: tournament.players,
  };
}

export function encodeTournament(tournament: Tournament): string {
  return JSON.stringify(
    { format: TOURNAMENT_FORMAT, ...tournamentRecord(tournament), version: TOURNAMENT_VERSION },
    null,
    2,
  );
}

export function decodeTournament(text: string): TournamentRead {
  const invalid = { notice: TournamentNotice.invalid };
  const value = isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? parseJson(text) : undefined;
  if (!isJsonObject(value)) return invalid;
  if (value.format !== TOURNAMENT_FORMAT || value.version !== TOURNAMENT_VERSION) return invalid;
  const unknown = unknownField(value, ROOT_KEYS);
  if (unknown !== null) return { notice: `Unknown field: ${unknown}.` };
  if (!hasExactKeys(value, ROOT_KEYS)) return invalid;
  const tournament = readTournament({ matches: value.matches, players: value.players });
  return tournament ? { tournament } : invalid;
}

// Finds the first field outside the format in document order, inside matches and attempts too.
function unknownField(value: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const [key, child] of Object.entries(value)) {
    if (!keys.includes(key)) return key;
    const inner = LIST_KEYS[key];
    if (!inner || !Array.isArray(child)) continue;
    for (const item of child) {
      const found = isJsonObject(item) ? unknownField(item, inner) : null;
      if (found !== null) return found;
    }
  }
  return null;
}

// Reads the players and matches of an export or a saved record.
export function readTournament(value: unknown): Tournament | null {
  if (!isJsonObject(value) || !hasExactKeys(value, RECORD_KEYS)) return null;
  const { players, matches } = value;
  if (!Array.isArray(players) || !Array.isArray(matches)) return null;
  const names = players.filter((name): name is string => typeof name === 'string');
  const read: Match[] = [];
  for (const match of matches) {
    const next = readMatch(match);
    if (!next) return null;
    read.push(next);
  }
  const tournament = { players: names, matches: read };
  return names.length === players.length && isValidTournament(tournament) ? tournament : null;
}

function readMatch(value: unknown): Match | null {
  if (!isJsonObject(value) || !hasExactKeys(value, MATCH_KEYS)) return null;
  if (typeof value.boardCode !== 'string' || !Array.isArray(value.attempts)) return null;
  const attempts: Attempt[] = [];
  for (const attempt of value.attempts) {
    if (!isJsonObject(attempt) || !hasExactKeys(attempt, ATTEMPT_KEYS)) return null;
    if (typeof attempt.moves !== 'number' || typeof attempt.elapsedMs !== 'number') return null;
    attempts.push({ moves: attempt.moves, elapsedMs: attempt.elapsedMs });
  }
  return { boardCode: value.boardCode, attempts };
}
