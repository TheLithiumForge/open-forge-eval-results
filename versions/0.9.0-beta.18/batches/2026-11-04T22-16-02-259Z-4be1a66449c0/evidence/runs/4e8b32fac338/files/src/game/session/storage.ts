import { isSize } from '../deck';
import type { Size } from '../deck';
import { MAX_MOVES } from '../game';
import { integer, object } from '../validation';
const SIZE_KEY = 'neon-pairs-size', BEST_KEY = 'neon-pairs-best';
export type Bests = Partial<Record<Size, number>>;
export function readSize(): Size {
  try { const size: unknown = JSON.parse(localStorage.getItem(SIZE_KEY) ?? 'null'); return isSize(size) ? size : 4; } catch { return 4; }
}
export function readBests(): Bests {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}');
    if (!object(data)) return {};
    const bests: Bests = {};
    for (const [key, value] of Object.entries(data)) { const size = Number(key); if (String(size) === key && isSize(size) && integer(value, 0, MAX_MOVES)) bests[size] = value; }
    return bests;
  } catch { return {}; }
}
export function saveSize(size: Size): void { try { localStorage.setItem(SIZE_KEY, JSON.stringify(size)); } catch { /* storage is optional */ } }
export function saveBests(bests: Bests): void { try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch { /* storage is optional */ } }
