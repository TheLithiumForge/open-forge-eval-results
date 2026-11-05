export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function nameError(names: readonly string[]): string {
  const normalized = names.map(normalizeName);
  if (normalized.some((name) => [...name].length < 2 || [...name].length > 20))
    return 'Use 2 to 20 characters.';
  if (new Set(normalized.map((name) => name.toLowerCase())).size !== normalized.length)
    return 'Each name must be different.';
  return '';
}
