export const TournamentNameError = {
  length: 'Use 2 to 20 characters.',
  duplicate: 'Each name must be different.',
} as const;

export function normalizeTournamentName(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function validateTournamentNames(names: readonly string[]): string | null {
  if (
    names.some((name) => {
      const length = Array.from(name).length;
      return length < 2 || length > 20;
    })
  )
    return TournamentNameError.length;
  const folded = names.map((name) => name.toLowerCase());
  return new Set(folded).size === folded.length ? null : TournamentNameError.duplicate;
}

export function isAcceptedTournamentName(name: string): boolean {
  return normalizeTournamentName(name) === name && validateTournamentNames([name]) === null;
}
