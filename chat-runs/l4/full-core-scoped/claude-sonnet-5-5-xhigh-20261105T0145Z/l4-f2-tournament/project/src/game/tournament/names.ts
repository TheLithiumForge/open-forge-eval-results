const NAME_MIN = 2;
const NAME_MAX = 20;
export const NameNotice = {
  length: 'Use 2 to 20 characters.',
  duplicate: 'Each name must be different.',
} as const;

// The accepted representation: trimmed, one space per inner whitespace run, composed (NFC).
export function normalizeName(draft: string): string {
  return draft.trim().replace(/\s+/g, ' ').normalize('NFC');
}

function codePoints(name: string): number {
  return Array.from(name).length;
}

// Checks the accepted names of one group. A length failure wins over a repeat.
export function nameProblem(names: readonly string[]): string | null {
  const accepted = names.map(normalizeName);
  for (const name of accepted) {
    const length = codePoints(name);
    if (length < NAME_MIN || length > NAME_MAX) return NameNotice.length;
  }
  const keys = new Set(accepted.map((name) => name.toLowerCase()));
  return keys.size === accepted.length ? null : NameNotice.duplicate;
}
