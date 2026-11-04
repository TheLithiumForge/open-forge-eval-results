export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

export function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max;
}

export function array(value: unknown): value is unknown[] { return Array.isArray(value); }

export function parseJson(text: string, byteLimit: number): unknown {
  if (text.length > byteLimit || new TextEncoder().encode(text).length > byteLimit) return null;
  try { const value: unknown = JSON.parse(text); return value; } catch { return null; }
}
