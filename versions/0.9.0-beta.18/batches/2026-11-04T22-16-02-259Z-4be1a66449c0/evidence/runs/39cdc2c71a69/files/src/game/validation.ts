export function object(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export function keys(value: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every(key => Object.hasOwn(value, key));
}
export function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max;
}
export function parseJSON(text: string, limit: number): unknown {
  if (new TextEncoder().encode(text).length > limit) return null;
  try { return JSON.parse(text) as unknown; } catch { return null; }
}
