import { isSize } from '../deck.ts';
import type { Size } from '../deck.ts';
import { MAX_MOVES } from '../game.ts';
import { integer, object } from '../validation.ts';
const SIZE_KEY = 'neon-pairs-size', BEST_KEY = 'neon-pairs-best';
export function readSize(): Size {
  try { const value: unknown = JSON.parse(localStorage.getItem(SIZE_KEY) ?? 'null'); return isSize(value) ? value : 4; } catch { return 4; }
}
export function saveSize(size: Size): void { try { localStorage.setItem(SIZE_KEY, JSON.stringify(size)); } catch { /* storage is optional */ } }
export function readBests(): Partial<Record<Size, number>> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}');
    const bests: Partial<Record<Size, number>> = {};
    if (object(data)) for (const [key, value] of Object.entries(data)) { const size = Number(key); if (String(size) === key && isSize(size) && integer(value, MAX_MOVES)) bests[size] = value; }
    return bests;
  } catch { return {}; }
}
export function saveBests(bests: Partial<Record<Size, number>>): void { try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch { /* storage is optional */ } }
