import type { PlayerCount } from './rules.ts';

export type PlayerNameCheck =
  | { readonly ok: true; readonly names: readonly string[] }
  | { readonly ok: false; readonly error: string };

export function normalizePlayerName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function isValidPlayerName(name: string): boolean {
  const length = Array.from(name).length;
  return length >= 2 && length <= 20;
}

export function validatePlayerNames(
  values: readonly string[],
  count: PlayerCount,
): PlayerNameCheck {
  if (values.length !== count) return { ok: false, error: 'Enter a name for every player.' };
  const names = values.map(normalizePlayerName);
  if (names.some((name) => !isValidPlayerName(name)))
    return { ok: false, error: 'Use 2 to 20 characters.' };
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) return { ok: false, error: 'Each name must be different.' };
    seen.add(key);
  }
  return { ok: true, names };
}
