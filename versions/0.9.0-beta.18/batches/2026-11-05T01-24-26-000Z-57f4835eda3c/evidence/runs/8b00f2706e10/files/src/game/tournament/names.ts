export const NameProblem = {
  length: 'Use 2 to 20 characters.',
  repeat: 'Each name must be different.',
} as const;

const NAME_MIN_POINTS = 2;
const NAME_MAX_POINTS = 20;

// The one stored and shown form of a typed name. Applying it again changes nothing.
export function acceptedName(draft: string): string {
  return draft.trim().replace(/\s+/g, ' ').normalize('NFC');
}

// Counts code points in the accepted form, so a supplementary-plane symbol counts once.
function hasValidLength(name: string): boolean {
  const points = Array.from(name).length;
  return points >= NAME_MIN_POINTS && points <= NAME_MAX_POINTS;
}

// Compares names in one group without regard to case. The key is never shown.
function comparisonKey(name: string): string {
  return name.toUpperCase().toLowerCase().normalize('NFC');
}

// Checks accepted names for one group. Length is checked before repeats.
export function nameProblem(names: readonly string[]): string | null {
  if (!names.every(hasValidLength)) return NameProblem.length;
  const keys = new Set(names.map(comparisonKey));
  return keys.size === names.length ? null : NameProblem.repeat;
}
