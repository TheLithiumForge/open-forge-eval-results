import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { readTournament } from './validation.ts';
import { SelectionKind } from '../selection.ts';
import type { TournamentState } from './rules.ts';

export const TOURNAMENT_MAX_BYTES = 262_144;
export const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
export const TOURNAMENT_VERSION = 1;
const KEYS = ['format', 'game', 'matchIndex', 'matches', 'names', 'phase', 'version'];

export function encodeTournament(state: TournamentState): string {
  const game = state.game ? parseJson(encodeSnapshot(state.game)) : null;
  return JSON.stringify(
    { ...state, game, format: TOURNAMENT_FORMAT, version: TOURNAMENT_VERSION },
    (_key, value: unknown) =>
      isJsonObject(value)
        ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
        : value,
    2,
  );
}

// Unknown keys are diagnosed at every declared object boundary, before accepting data.
function unknownField(value: Record<string, unknown>): string | undefined {
  const root = Object.keys(value).find((key) => !KEYS.includes(key));
  if (root !== undefined) return root;
  if (Array.isArray(value.matches)) {
    for (const match of value.matches) {
      if (!isJsonObject(match)) continue;
      const key = Object.keys(match).find((key) => !['boardCode', 'results'].includes(key));
      if (key !== undefined) return key;
      if (!Array.isArray(match.results)) continue;
      for (const result of match.results) {
        if (!isJsonObject(result)) continue;
        const extra = Object.keys(result).find((key) => !['moves', 'elapsedMs'].includes(key));
        if (extra !== undefined) return extra;
      }
    }
  }
  if (!isJsonObject(value.game)) return undefined;
  const extra = Object.keys(value.game).find(
    (key) =>
      !['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'].includes(
        key,
      ),
  );
  if (extra !== undefined) return extra;
  const selection = value.game.selection;
  if (!isJsonObject(selection)) return undefined;
  const fields =
    selection.kind === SelectionKind.closed
      ? ['kind']
      : selection.kind === SelectionKind.one
        ? ['kind', 'index']
        : ['kind', 'first', 'second', 'remainingMs'];
  return Object.keys(selection).find((key) => !fields.includes(key));
}

export function decodeTournament(text: string): { state: TournamentState | null; problem: string } {
  const invalid = { state: null, problem: 'Invalid tournament.' };
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return invalid;
  const value = parseJson(text);
  if (!isJsonObject(value)) return invalid;
  const extra = unknownField(value);
  if (extra !== undefined) return { state: null, problem: `Unknown field: ${extra}.` };
  if (
    !hasExactKeys(value, KEYS) ||
    value.format !== TOURNAMENT_FORMAT ||
    value.version !== TOURNAMENT_VERSION
  )
    return invalid;
  const game = value.game === null ? null : decodeSnapshot(JSON.stringify(value.game));
  if (value.game !== null && game === null) return invalid;
  const state = readTournament(value, game);
  return state ? { state, problem: '' } : invalid;
}
