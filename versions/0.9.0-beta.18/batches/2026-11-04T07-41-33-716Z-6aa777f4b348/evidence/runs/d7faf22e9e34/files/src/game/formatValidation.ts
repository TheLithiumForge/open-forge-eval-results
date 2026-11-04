export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function parseLimitedJson(text: string, byteLimit: number): unknown {
  if (text.length > byteLimit || new TextEncoder().encode(text).length > byteLimit) return null;
  try { const value: unknown = JSON.parse(text); return value; } catch { return null; }
}
