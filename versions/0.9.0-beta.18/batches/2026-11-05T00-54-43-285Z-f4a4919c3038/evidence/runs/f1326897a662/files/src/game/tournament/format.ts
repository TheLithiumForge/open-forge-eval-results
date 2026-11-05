import { decodeSnapshot } from '../snapshot.ts';
import { isWon } from '../game.ts';
import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { normalizeName } from './names.ts';
import { TournamentPhase } from './rules.ts';
import { readTournament, unknownTournamentField } from './validation.ts';
import type { TournamentState } from './rules.ts';
import type { GameState } from '../game.ts';

const FORMAT = 'neon-pairs/tournament';
const VERSION = 1;
const DOCUMENT_KEYS = ['format', 'setup', 'snapshot', 'tournament', 'version'];
const SETUP_KEYS = ['count', 'names'];
export const TOURNAMENT_MAX_BYTES = 1_048_576;
export interface TournamentSetup {
  readonly count: 4 | 8;
  readonly names: readonly string[];
}
export interface TournamentDocument {
  readonly setup: TournamentSetup;
  readonly tournament: TournamentState | null;
  readonly game: GameState | null;
}

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (isJsonObject(value))
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sorted(value[key])]),
    );
  return value;
}

export function encodeTournament(
  setup: TournamentSetup,
  tournament: TournamentState | null,
  snapshot: string | null,
): string {
  return JSON.stringify(
    sorted({
      format: FORMAT,
      setup: { ...setup, names: setup.names.map(normalizeName) },
      snapshot,
      tournament,
      version: VERSION,
    }),
    null,
    2,
  );
}

function unknownField(value: Record<string, unknown>): string | null {
  const root = Object.keys(value).find((key) => !DOCUMENT_KEYS.includes(key));
  if (root !== undefined) return root;
  if (isJsonObject(value.setup)) {
    const field = Object.keys(value.setup).find((key) => !SETUP_KEYS.includes(key));
    if (field !== undefined) return field;
  }
  return unknownTournamentField(value.tournament);
}

export function decodeTournament(text: string): TournamentDocument | string {
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return 'Invalid tournament.';
  const value = parseJson(text);
  if (!isJsonObject(value)) return 'Invalid tournament.';
  const unknown = unknownField(value);
  if (unknown !== null) return `Unknown field: ${unknown}.`;
  if (
    !hasExactKeys(value, DOCUMENT_KEYS) ||
    value.format !== FORMAT ||
    value.version !== VERSION ||
    !isJsonObject(value.setup) ||
    !hasExactKeys(value.setup, SETUP_KEYS) ||
    (value.setup.count !== 4 && value.setup.count !== 8) ||
    !Array.isArray(value.setup.names) ||
    value.setup.names.length !== 8
  )
    return 'Invalid tournament.';
  const names: string[] = [];
  for (const name of value.setup.names) {
    if (typeof name !== 'string') return 'Invalid tournament.';
    names.push(normalizeName(name));
  }
  const setup: TournamentSetup = { count: value.setup.count, names };
  const tournament = value.tournament === null ? null : readTournament(value.tournament);
  if (value.tournament !== null && !tournament) return 'Invalid tournament.';
  if (tournament?.phase === TournamentPhase.playing) {
    if (typeof value.snapshot !== 'string') return 'Invalid tournament.';
    const game = decodeSnapshot(value.snapshot);
    if (
      !game ||
      isWon(game) ||
      game.boardCode !== tournament.matches[tournament.currentMatch]?.boardCode
    )
      return 'Invalid tournament.';
    return { setup, tournament, game };
  }
  if (value.snapshot !== null) return 'Invalid tournament.';
  return { setup, tournament, game: null };
}
