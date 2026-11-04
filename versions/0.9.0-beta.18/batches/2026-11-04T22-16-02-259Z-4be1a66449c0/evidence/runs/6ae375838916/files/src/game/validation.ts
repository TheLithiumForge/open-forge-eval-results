export function object(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export function keys(value: Record<string, unknown>, names: readonly string[]): boolean {
  return Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
}
export function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}
export function parseJson(text: string, limit: number): unknown {
  if (new TextEncoder().encode(text).length > limit) return null;
  try { const value: unknown = JSON.parse(text); return value; } catch { return null; }
}
