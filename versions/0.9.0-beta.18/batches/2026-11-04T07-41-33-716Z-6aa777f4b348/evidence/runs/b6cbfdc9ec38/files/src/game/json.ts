export function parseLimitedJson(text: string, byteLimit: number): unknown {
  if (text.length > byteLimit || new TextEncoder().encode(text).byteLength > byteLimit) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

export function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function isNatural(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function isPosition(value: unknown, count: number): value is number {
  return isNatural(value) && value < count;
}
