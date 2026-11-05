import { isValidSize } from '../deck.ts';
import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { readTournament, serializedTournament } from './tournament-format.ts';
import type { Tournament } from './tournament.ts';

export const TOURNAMENT_JSON_MAX = 1_048_576;

export interface TournamentSetupState {
  readonly playerCount: number;
  readonly names: readonly string[];
  readonly size: number;
}

export interface TournamentDocument {
  readonly setup: TournamentSetupState;
  readonly tournament: Tournament | null;
  readonly pastTournaments: readonly Tournament[];
}

function readSetup(value: unknown): TournamentSetupState | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['playerCount', 'names', 'size']) ||
    (value.playerCount !== 4 && value.playerCount !== 8) ||
    !Array.isArray(value.names) ||
    value.names.length !== 8 ||
    typeof value.size !== 'number' ||
    !isValidSize(value.size)
  )
    return null;
  const names: string[] = [];
  for (const name of value.names) {
    if (typeof name !== 'string' || name.length > 60) return null;
    names.push(name);
  }
  return { playerCount: value.playerCount, names, size: value.size };
}

export function encodeTournamentDocument(document: TournamentDocument): string {
  return JSON.stringify(
    {
      version: 1,
      setup: document.setup,
      tournament: document.tournament ? serializedTournament(document.tournament) : null,
      pastTournaments: document.pastTournaments.map(serializedTournament),
    },
    null,
    2,
  );
}

export function decodeTournamentDocument(text: string): TournamentDocument | null {
  const value = isWithinBytes(text, TOURNAMENT_JSON_MAX) ? parseJson(text) : undefined;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['version', 'setup', 'tournament', 'pastTournaments']) ||
    value.version !== 1 ||
    !Array.isArray(value.pastTournaments)
  )
    return null;
  const setup = readSetup(value.setup);
  if (!setup) return null;
  const tournament = value.tournament === null ? null : readTournament(value.tournament);
  if (value.tournament !== null && !tournament) return null;
  const pastTournaments: Tournament[] = [];
  for (const item of value.pastTournaments) {
    const past = readTournament(item);
    if (!past || past.stage !== 'complete' || pastTournaments.some(({ id }) => id === past.id))
      return null;
    pastTournaments.push(past);
  }
  return { setup, tournament, pastTournaments };
}
