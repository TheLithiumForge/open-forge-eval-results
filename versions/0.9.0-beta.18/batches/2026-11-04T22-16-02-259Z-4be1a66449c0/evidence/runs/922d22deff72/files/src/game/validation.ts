export function object(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export function keys(value: Record<string, unknown>, expected: readonly string[]): boolean { const actual = Object.keys(value); return actual.length === expected.length && expected.every(k => Object.hasOwn(value, k)); }
export function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max; }
export function readJSON(text: string, maxBytes: number): unknown { if (new TextEncoder().encode(text).length > maxBytes) return null; try { return JSON.parse(text) as unknown; } catch { return null; } }
