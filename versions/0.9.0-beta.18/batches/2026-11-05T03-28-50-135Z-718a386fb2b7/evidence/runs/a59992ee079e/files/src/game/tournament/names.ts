type NameCheck =
  | { readonly accepted: true; readonly names: readonly string[] }
  | { readonly accepted: false; readonly message: string };

export function normalizePlayerName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function checkPlayerNames(values: readonly string[], count: 4 | 8): NameCheck {
  if (values.length < count) return { accepted: false, message: 'Use 2 to 20 characters.' };
  const names = values.slice(0, count).map(normalizePlayerName);
  if (
    names.some((name) => {
      const length = Array.from(name).length;
      return length < 2 || length > 20;
    })
  )
    return { accepted: false, message: 'Use 2 to 20 characters.' };
  if (new Set(names.map((name) => name.toLowerCase())).size !== count)
    return { accepted: false, message: 'Each name must be different.' };
  return { accepted: true, names };
}
