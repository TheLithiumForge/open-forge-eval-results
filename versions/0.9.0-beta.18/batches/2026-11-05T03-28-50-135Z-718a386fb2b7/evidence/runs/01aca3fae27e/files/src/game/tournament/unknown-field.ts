import { isJsonObject } from '../saved-format.ts';

function extra(value: unknown, allowed: readonly string[]): string | undefined {
  return isJsonObject(value) ? Object.keys(value).find((key) => !allowed.includes(key)) : undefined;
}
export function unknownTournamentField(value: unknown): string | undefined {
  if (!isJsonObject(value)) return undefined;
  let field = extra(value, ['format', 'snapshot', 'tournament', 'version']);
  if (field) return field;
  const t = value.tournament;
  field = extra(t, ['index', 'matches', 'names']);
  if (field) return field;
  if (isJsonObject(t) && Array.isArray(t.matches)) {
    for (const match of t.matches) {
      field = extra(match, ['boardCode', 'players', 'results', 'winner']);
      if (field) return field;
      if (isJsonObject(match) && Array.isArray(match.results)) {
        for (const result of match.results) {
          field = extra(result, ['elapsedMs', 'moves']);
          if (field) return field;
        }
      }
    }
  }
  const snapshot = value.snapshot;
  field = extra(snapshot, [
    'boardCode',
    'elapsedMs',
    'matched',
    'moves',
    'selection',
    'started',
    'version',
  ]);
  if (field) return field;
  if (isJsonObject(snapshot) && isJsonObject(snapshot.selection)) {
    const selection = snapshot.selection;
    const allowed =
      selection.kind === 'one'
        ? ['kind', 'index']
        : selection.kind === 'mismatch'
          ? ['kind', 'first', 'second', 'remainingMs']
          : ['kind'];
    return extra(selection, allowed);
  }
  return undefined;
}
