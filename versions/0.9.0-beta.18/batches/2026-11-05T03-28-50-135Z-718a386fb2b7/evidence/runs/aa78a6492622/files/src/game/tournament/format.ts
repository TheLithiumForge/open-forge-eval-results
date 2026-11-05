import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { parseEvent, serializeEvent } from './event-format.ts';
import type { Tournament } from './rules.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
export const TOURNAMENT_FILE_FORMAT = 'neon-pairs/tournament';
export const TOURNAMENT_FILE_VERSION = 1;
export const TOURNAMENT_HISTORY_VERSION = 3;
export const TOURNAMENT_HISTORY_LIMIT = 10;
const TOURNAMENT_JSON_MAX_BYTES = 262_144;

export interface TournamentDraft {
  readonly playerCount: 4 | 8;
  readonly names: readonly string[];
}

export type TournamentLoad =
  | { readonly kind: 'setup'; readonly draft: TournamentDraft }
  | { readonly kind: 'event'; readonly tournament: Tournament };

export function encodeTournamentFile(
  tournament: Tournament | null,
  draft: TournamentDraft,
): string {
  const data = tournament ? serializeEvent(tournament) : serializeDraft(draft);
  return JSON.stringify(
    { data, format: TOURNAMENT_FILE_FORMAT, version: TOURNAMENT_FILE_VERSION },
    null,
    2,
  );
}

export function decodeTournamentFile(text: string): TournamentLoad | null {
  if (!isWithinBytes(text, TOURNAMENT_JSON_MAX_BYTES)) return null;
  const value = parseJson(text);
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['data', 'format', 'version']) ||
    value.format !== TOURNAMENT_FILE_FORMAT ||
    value.version !== TOURNAMENT_FILE_VERSION ||
    !isJsonObject(value.data)
  )
    return null;
  if (value.data.kind === 'event') {
    const tournament = parseEvent(value.data);
    return tournament ? { kind: 'event', tournament } : null;
  }
  return readDraft(value.data);
}

export function encodeTournamentHistory(tournaments: readonly Tournament[]): string {
  return JSON.stringify({
    items: tournaments.slice(0, TOURNAMENT_HISTORY_LIMIT).map(serializeEvent),
    v: TOURNAMENT_HISTORY_VERSION,
  });
}

export function decodeTournamentHistory(text: string): readonly Tournament[] | null {
  if (!isWithinBytes(text, TOURNAMENT_JSON_MAX_BYTES)) return null;
  const value = parseJson(text);
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['items', 'v']) ||
    value.v !== TOURNAMENT_HISTORY_VERSION ||
    !Array.isArray(value.items) ||
    value.items.length > TOURNAMENT_HISTORY_LIMIT
  )
    return null;
  const tournaments: Tournament[] = [];
  for (const item of value.items) {
    const tournament = parseEvent(item);
    if (!tournament || tournament.phase !== 'finished') return null;
    tournaments.push(tournament);
  }
  return tournaments;
}

function serializeDraft(draft: TournamentDraft): Record<string, unknown> {
  return { kind: 'setup', names: draft.names.slice(0, 8), playerCount: draft.playerCount };
}

function readDraft(value: Record<string, unknown>): TournamentLoad | null {
  if (!hasExactKeys(value, ['kind', 'names', 'playerCount']) || value.kind !== 'setup') return null;
  if (
    (value.playerCount !== 4 && value.playerCount !== 8) ||
    !Array.isArray(value.names) ||
    value.names.length !== 8 ||
    !value.names.every((name) => typeof name === 'string' && Array.from(name).length <= 100)
  )
    return null;
  return {
    kind: 'setup',
    draft: { playerCount: value.playerCount, names: value.names },
  };
}
