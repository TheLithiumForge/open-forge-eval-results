function normalizeTournamentName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').normalize('NFC');
}

export function validateTournamentNames(values: readonly string[]):
  | { readonly names: readonly string[]; readonly error: '' }
  | {
      readonly names: readonly string[];
      readonly error: 'Use 2 to 20 characters.' | 'Each name must be different.';
    } {
  const names = values.map(normalizeTournamentName);
  if (
    names.some((name) => {
      const length = Array.from(name).length;
      return length < 2 || length > 20;
    })
  )
    return { names, error: 'Use 2 to 20 characters.' };
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return { names, error: 'Each name must be different.' };
  return { names, error: '' };
}
