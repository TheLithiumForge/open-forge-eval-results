export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function nameError(names: readonly string[]): string {
  if (
    names.some(
      (name) => [...normalizeName(name)].length < 2 || [...normalizeName(name)].length > 20,
    )
  )
    return 'Use 2 to 20 characters.';
  const keys = names.map((name) => normalizeName(name).toLowerCase());
  return new Set(keys).size === keys.length ? '' : 'Each name must be different.';
}
