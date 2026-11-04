import { sizes, maxMoves } from '../core.ts';
const sizeKey = 'neon-pairs-size', bestKey = 'neon-pairs-best';
export function readSize(): number { try { const n = Number(localStorage.getItem(sizeKey)); return sizes.some(x => x === n) ? n : 4; } catch { return 4; } }
export function saveSize(size: number): void { try { localStorage.setItem(sizeKey, String(size)); } catch { /* storage is optional */ } }
export function readBests(): Record<string, number> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(bestKey) ?? '{}');
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
    const result: Record<string, number> = {};
    for (const size of sizes) { const score: unknown = Reflect.get(value, String(size)); if (typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= maxMoves) result[size] = score; }
    return result;
  } catch { return {}; }
}
export function saveBests(bests: Record<string, number>): void { try { localStorage.setItem(bestKey, JSON.stringify(bests)); } catch { /* storage is optional */ } }
