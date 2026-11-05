export const NAME_MAX_CHARACTERS = 24;

// Names keep single spaces and no control characters, so a saved name reads the same everywhere.
export function normalizeName(raw: string): string {
  const spaced = raw.replace(/[\p{C}\s]+/gu, ' ').trim();
  return [...spaced].slice(0, NAME_MAX_CHARACTERS).join('').trim();
}

export function isValidName(name: string): boolean {
  return name.length > 0 && name === normalizeName(name);
}

// Players are told apart by name, so two names that differ only in letter case count as one.
export function hasDistinctNames(names: readonly string[]): boolean {
  return new Set(names.map((name) => name.toLowerCase())).size === names.length;
}

// A blank entry plays under its own label. Duplicate names give no list.
export function resolvePlayers(
  entries: readonly string[],
  count: number,
): readonly string[] | null {
  const names = Array.from(
    { length: count },
    (_, position) => normalizeName(entries[position] ?? '') || `Player ${position + 1}`,
  );
  return hasDistinctNames(names) ? names : null;
}
