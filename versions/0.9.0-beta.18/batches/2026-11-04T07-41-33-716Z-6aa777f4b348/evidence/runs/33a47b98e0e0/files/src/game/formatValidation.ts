export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

export function isSafeCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function isIndex(value: unknown, length: number): value is number {
  return isSafeCount(value) && value < length;
}

export function isJsonWithinBytes(text: string, limit: number): boolean {
  return new TextEncoder().encode(text).byteLength <= limit;
}

export function parseJson(text: string, limit: number): unknown | null {
  if (!isJsonWithinBytes(text, limit)) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    return null;
  }
}
