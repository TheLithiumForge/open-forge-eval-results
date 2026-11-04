import { isSize } from '../deck.ts';
import type { Size } from '../deck.ts';
import { MAX_MOVES } from '../state.ts';
import { integer, object } from '../validation.ts';
const SIZE_KEY = 'neon-pairs-size', BEST_KEY = 'neon-pairs-best';
export function loadSize(): Size {
  try { const value: unknown = JSON.parse(localStorage.getItem(SIZE_KEY) ?? 'null'); return isSize(value) ? value : 4; } catch { return 4; }
}
export function saveSize(size: Size): void { try { localStorage.setItem(SIZE_KEY, JSON.stringify(size)); } catch { /* storage is optional */ } }
export function loadBests(): Partial<Record<Size, number>> {
  const bests: Partial<Record<Size, number>> = {};
  try {
    const value: unknown = JSON.parse(localStorage.getItem(BEST_KEY) ?? 'null');
    if (object(value)) for (const [key, score] of Object.entries(value)) {
      const size = Number(key);
      if (String(size) === key && isSize(size) && integer(score, MAX_MOVES)) bests[size] = score;
    }
  } catch { /* storage is optional */ }
  return bests;
}
export function saveBests(bests: Partial<Record<Size, number>>): void { try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch { /* storage is optional */ } }
