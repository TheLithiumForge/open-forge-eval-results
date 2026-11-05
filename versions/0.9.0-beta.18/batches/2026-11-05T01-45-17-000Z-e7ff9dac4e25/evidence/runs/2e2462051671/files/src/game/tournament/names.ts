const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 20;

const NameNotice = {
  length: 'Use 2 to 20 characters.',
  repeat: 'Each name must be different.',
} as const;

type NameCheck =
  | { readonly ok: true; readonly names: readonly string[] }
  | { readonly ok: false; readonly notice: string };

// An accepted name is trimmed, has each inner whitespace run collapsed to one space and is in NFC.
export function normalizeName(draft: string): string {
  return draft.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

// Length counts Unicode code points of the accepted representation, not UTF-16 units.
export function isValidNameLength(name: string): boolean {
  const length = Array.from(name).length;
  return length >= NAME_MIN_LENGTH && length <= NAME_MAX_LENGTH;
}

// Names in one group compare without regard to case. Display keeps the spelling that was typed.
function nameKey(name: string): string {
  return name.toLowerCase();
}

export function hasRepeatedName(names: readonly string[]): boolean {
  return new Set(names.map(nameKey)).size !== names.length;
}

export function checkNames(drafts: readonly string[]): NameCheck {
  const names = drafts.map(normalizeName);
  if (!names.every(isValidNameLength)) return { ok: false, notice: NameNotice.length };
  if (hasRepeatedName(names)) return { ok: false, notice: NameNotice.repeat };
  return { ok: true, names };
}
