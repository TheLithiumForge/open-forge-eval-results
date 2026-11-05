const NAME_MIN_POINTS = 2;
const NAME_MAX_POINTS = 20;

export const NameProblem = {
  length: 'Use 2 to 20 characters.',
  repeat: 'Each name must be different.',
} as const;
type NameProblem = (typeof NameProblem)[keyof typeof NameProblem];

// The one form of a typed name that is stored and shown.
export function acceptedName(draft: string): string {
  return draft.trim().replace(/\s+/g, ' ').normalize('NFC');
}

// Counts code points, so a supplementary-plane symbol counts once.
function hasNameLength(name: string): boolean {
  const points = [...name].length;
  return points >= NAME_MIN_POINTS && points <= NAME_MAX_POINTS;
}

// Names in one group compare without regard to case. Display keeps the typed capitalization.
function comparisonKey(name: string): string {
  return name.toLowerCase().normalize('NFC');
}

// Checks accepted names. Length is checked for the whole group before repeats.
export function nameProblem(names: readonly string[]): NameProblem | null {
  if (!names.every(hasNameLength)) return NameProblem.length;
  return new Set(names.map(comparisonKey)).size === names.length ? null : NameProblem.repeat;
}

export function isNameGroup(names: readonly string[]): boolean {
  return names.every((name) => acceptedName(name) === name) && nameProblem(names) === null;
}
