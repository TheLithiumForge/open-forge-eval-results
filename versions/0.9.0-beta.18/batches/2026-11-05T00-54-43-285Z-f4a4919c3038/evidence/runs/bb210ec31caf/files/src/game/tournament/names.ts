export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function nameError(names: readonly string[]): string | null {
  if (names.some((name) => [...name].length < 2 || [...name].length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return 'Each name must be different.';
  return null;
}
