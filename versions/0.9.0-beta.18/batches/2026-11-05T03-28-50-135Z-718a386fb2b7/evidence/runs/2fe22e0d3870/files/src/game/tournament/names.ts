const NAME_LENGTH_ERROR = 'Use 2 to 20 characters.';
const DUPLICATE_NAME_ERROR = 'Each name must be different.';

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function validateNames(values: readonly string[], count: number) {
  const names = values.slice(0, count).map(normalizeName);
  if (
    names.length !== count ||
    names.some((name) => {
      const length = Array.from(name).length;
      return length < 2 || length > 20;
    })
  )
    return { names, error: NAME_LENGTH_ERROR };
  const distinct = new Set(names.map((name) => name.toLowerCase()));
  return distinct.size === count ? { names, error: '' } : { names, error: DUPLICATE_NAME_ERROR };
}
