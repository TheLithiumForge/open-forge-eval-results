import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { isWon } from '../game.ts';
import { isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { readNames, readTournament, requireShape } from './read-tournament.ts';
import { TournamentPhase } from './rules.ts';
import type { TournamentState } from './rules.ts';

const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
const TOURNAMENT_VERSION = 1;
export const TOURNAMENT_MAX_BYTES = 65_536;
export interface TournamentDocument {
  readonly names: readonly string[];
  readonly snapshot: string | null;
  readonly tournament: TournamentState | null;
}

// Sorting the constructed data keeps every exported object canonical, including result records.
function alphabetical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(alphabetical);
  if (!isJsonObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, alphabetical(value[key])]),
  );
}

export function encodeTournament(data: TournamentDocument): string {
  return JSON.stringify(
    alphabetical({
      ...data,
      snapshot: data.snapshot ? parseJson(data.snapshot) : null,
      format: TOURNAMENT_FORMAT,
      version: TOURNAMENT_VERSION,
    }),
    null,
    2,
  );
}

export function decodeTournament(text: string) {
  try {
    if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) throw new Error('Invalid tournament.');
    const value = requireShape(parseJson(text), [
      'format',
      'names',
      'snapshot',
      'tournament',
      'version',
    ]);
    if (value.format !== TOURNAMENT_FORMAT || value.version !== TOURNAMENT_VERSION)
      throw new Error('Invalid tournament.');
    const names = readNames(value.names);
    const tournament = value.tournament === null ? null : readTournament(value.tournament);
    if (tournament && JSON.stringify(tournament.players) !== JSON.stringify(names))
      throw new Error('Invalid tournament.');
    let snapshot: string | null = null;
    if (value.snapshot !== null) {
      if (tournament?.phase !== TournamentPhase.playing) throw new Error('Invalid tournament.');
      const raw = requireShape(value.snapshot, [
        'version',
        'boardCode',
        'matched',
        'selection',
        'moves',
        'elapsedMs',
        'started',
      ]);
      const selection = raw.selection;
      const keys =
        isJsonObject(selection) && selection.kind === 'one'
          ? ['kind', 'index']
          : isJsonObject(selection) && selection.kind === 'mismatch'
            ? ['kind', 'first', 'second', 'remainingMs']
            : ['kind'];
      requireShape(selection, keys);
      const game = decodeSnapshot(JSON.stringify(raw));
      if (
        !game ||
        isWon(game) ||
        game.boardCode !== tournament.matches[tournament.matchIndex]?.boardCode
      )
        throw new Error('Invalid tournament.');
      snapshot = encodeSnapshot(game);
    } else if (tournament?.phase === TournamentPhase.playing)
      throw new Error('Invalid tournament.');
    const data: TournamentDocument = { names, snapshot, tournament };
    return { data, error: '' };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error && error.message.startsWith('Unknown field:')
          ? error.message
          : 'Invalid tournament.',
    };
  }
}
