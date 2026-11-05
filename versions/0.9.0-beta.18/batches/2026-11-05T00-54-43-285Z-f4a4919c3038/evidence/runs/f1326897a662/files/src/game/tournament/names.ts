export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function nameErrors(names: readonly string[]): readonly string[] {
  const normalized = names.map(normalizeName);
  const keys = normalized.map((name) => name.toLowerCase());
  return normalized.map((name, index) => {
    const length = Array.from(name).length;
    if (length < 2 || length > 20) return 'Use 2 to 20 characters.';
    return keys.some((key, other) => other !== index && key === keys[index])
      ? 'Each name must be different.'
      : '';
  });
}
