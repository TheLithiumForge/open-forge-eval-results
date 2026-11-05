export const NameError = {
  length: 'Use 2 to 20 characters.',
  duplicate: 'Each name must be different.',
} as const;
const NAME_MIN = 2;
const NAME_MAX = 20;

type NameCheck =
  | { readonly ok: true; readonly names: readonly string[] }
  | { readonly ok: false; readonly error: string; readonly fields: readonly number[] };

// An accepted name is trimmed, has each inner whitespace run collapsed to one space and is NFC.
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').normalize('NFC');
}

// Unicode code points, not UTF-16 units: a supplementary-plane symbol counts once.
export function countCharacters(name: string): number {
  return Array.from(name).length;
}

export function isNameLength(name: string): boolean {
  const length = countCharacters(name);
  return length >= NAME_MIN && length <= NAME_MAX;
}

// The comparison key is internal. The group keeps the spelling each person entered.
function comparisonKey(name: string): string {
  return name.toLowerCase().normalize('NFC');
}

// Checks every entry of one group: length first, then repeats across the whole group.
export function checkNames(raw: readonly string[]): NameCheck {
  const names = raw.map(normalizeName);
  const short = names.flatMap((name, index) => (isNameLength(name) ? [] : [index]));
  if (short.length > 0) return { ok: false, error: NameError.length, fields: short };
  const seen = new Map<string, number>();
  const repeated = new Set<number>();
  names.forEach((name, index) => {
    const first = seen.get(comparisonKey(name));
    if (first === undefined) seen.set(comparisonKey(name), index);
    else {
      repeated.add(first);
      repeated.add(index);
    }
  });
  if (repeated.size > 0)
    return { ok: false, error: NameError.duplicate, fields: [...repeated].sort((a, b) => a - b) };
  return { ok: true, names };
}
