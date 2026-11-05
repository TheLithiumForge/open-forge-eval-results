import { isJsonObject } from '../saved-format.ts';

function extra(value: unknown, keys: readonly string[]): string | null {
  if (!isJsonObject(value)) return null;
  return Object.keys(value).find((key) => !keys.includes(key)) ?? null;
}

export function tournamentUnknownField(value: unknown): string | null {
  let field = extra(value, ['format', 'state', 'version']);
  if (field || !isJsonObject(value) || !isJsonObject(value.state)) return field;
  const state = value.state;
  field = extra(
    state,
    state.kind === 'setup'
      ? ['kind', 'names']
      : ['deals', 'kind', 'names', 'phase', 'results', 'snapshot'],
  );
  if (field) return field;
  if (Array.isArray(state.results)) {
    for (const result of state.results) {
      field = extra(result, ['elapsedMs', 'moves']);
      if (field) return field;
    }
  }
  field = extra(state.snapshot, [
    'version',
    'boardCode',
    'matched',
    'selection',
    'moves',
    'elapsedMs',
    'started',
  ]);
  if (field || !isJsonObject(state.snapshot)) return field;
  const selection = state.snapshot.selection;
  if (!isJsonObject(selection)) return null;
  return extra(
    selection,
    selection.kind === 'closed'
      ? ['kind']
      : selection.kind === 'one'
        ? ['kind', 'index']
        : ['kind', 'first', 'second', 'remainingMs'],
  );
}
