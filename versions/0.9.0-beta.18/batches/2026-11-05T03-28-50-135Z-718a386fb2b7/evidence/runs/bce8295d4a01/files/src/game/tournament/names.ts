export function normalizePlayerName(draft: string): string {
  return draft.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function hasValidPlayerNames(names: readonly string[]): boolean {
  return names.every((name) => {
    const length = Array.from(name).length;
    return length >= 2 && length <= 20 && normalizePlayerName(name) === name;
  });
}

export function hasUniquePlayerNames(names: readonly string[]): boolean {
  const seen = new Set<string>();
  for (const name of names) {
    const comparison = name.toLowerCase();
    if (seen.has(comparison)) return false;
    seen.add(comparison);
  }
  return true;
}
