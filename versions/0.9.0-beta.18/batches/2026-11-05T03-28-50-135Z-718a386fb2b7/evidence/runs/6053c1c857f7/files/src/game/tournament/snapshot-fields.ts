import { isJsonObject, parseJson } from '../saved-format.ts';
import { SNAPSHOT_KEYS } from '../snapshot.ts';

export function snapshotFieldError(text: string): string | null {
  const value = parseJson(text);
  if (!isJsonObject(value)) return null;
  let extra = Object.keys(value).find((key) => !SNAPSHOT_KEYS.some((allowed) => allowed === key));
  if (extra) return `Unknown field: ${extra}.`;
  const selection = value.selection;
  if (!isJsonObject(selection)) return null;
  const allowed =
    selection.kind === 'closed'
      ? ['kind']
      : selection.kind === 'one'
        ? ['kind', 'index']
        : selection.kind === 'mismatch'
          ? ['kind', 'first', 'second', 'remainingMs']
          : [];
  if (!allowed.length) return null;
  extra = Object.keys(selection).find((key) => !allowed.includes(key));
  return extra ? `Unknown field: ${extra}.` : null;
}
