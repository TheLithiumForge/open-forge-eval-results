const NAME_MIN = 2;
const NAME_MAX = 20;
export const NameProblem = {
  length: 'Use 2 to 20 characters.',
  repeat: 'Each name must be different.',
} as const;

// A typed name is kept and shown trimmed, with each inner whitespace run as one space, in NFC.
export function acceptedName(draft: string): string {
  return draft.trim().replace(/\s+/g, ' ').normalize('NFC');
}

// Counts Unicode code points of accepted names, then compares them without case in the group.
export function nameProblem(names: readonly string[]): string | null {
  const lengths = names.map((name) => [...name].length);
  if (lengths.some((length) => length < NAME_MIN || length > NAME_MAX)) return NameProblem.length;
  const keys = new Set(names.map((name) => name.toUpperCase().toLowerCase().normalize('NFC')));
  return keys.size === names.length ? null : NameProblem.repeat;
}
