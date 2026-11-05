export function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function playerNamesError(names: readonly string[]): string | null {
  const normalized = names.map(normalizePlayerName);
  if (normalized.some((name) => [...name].length < 2 || [...name].length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(normalized.map((name) => name.toLowerCase())).size !== names.length)
    return 'Each name must be different.';
  return null;
}
