import { hasExactKeys, isJsonObject } from '../saved-format.ts';

export function objectWithKeys(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> | null {
  if (!isJsonObject(value)) return null;
  const known = new Set(keys);
  const unknown = Object.keys(value).find((key) => !known.has(key));
  if (unknown) throw new Error(`Unknown field: ${unknown}.`);
  return hasExactKeys(value, keys) ? value : null;
}

export function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}
