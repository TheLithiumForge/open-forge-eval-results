import { isSize } from '../deck.ts';
import type { Size } from '../deck.ts';
import { integer, object } from '../validation.ts';
import { MAX_MOVES } from '../state.ts';
const SIZE_KEY = 'neon-pairs-size', BEST_KEY = 'neon-pairs-best';
export function readSize(): Size { try { const value: unknown = JSON.parse(localStorage.getItem(SIZE_KEY) ?? 'null'); return typeof value === 'number' && isSize(value) ? value : 4; } catch { return 4; } }
export function saveSize(size: Size): void { try { localStorage.setItem(SIZE_KEY, JSON.stringify(size)); } catch { /* storage is optional */ } }
export function readBests(): Record<string, number> {
  try { const value: unknown = JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}'); const bests: Record<string, number> = {};
    if (object(value)) for (const [key, score] of Object.entries(value)) if (String(Number(key)) === key && isSize(Number(key)) && integer(score, MAX_MOVES)) bests[key] = score;
    return bests;
  } catch { return {}; }
}
export function saveBests(bests: Record<string, number>): void { try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch { /* storage is optional */ } }
