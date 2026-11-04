export function object(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export function keys(value: Record<string, unknown>, expected: readonly string[]): boolean { return Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key)); }
export function natural(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
export function json(text: string, limit: number): unknown {
  if (new TextEncoder().encode(text).length > limit) return null;
  try { return JSON.parse(text) as unknown; } catch { return null; }
}
