import { decodeTournament, encodeTournament } from './format.ts';
import type { Tournament } from './rules.ts';
const KEY = 'np3:tournaments';
export function readHistory(): { items: Tournament[]; blocked: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { items: [], blocked: false };
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return { items: [], blocked: false };
    }
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== 'items,v' ||
      !('v' in value) ||
      value.v !== 3 ||
      !('items' in value) ||
      !Array.isArray(value.items)
    )
      return { items: [], blocked: false };
    const items = value.items.map(
      (item: unknown) => decodeTournament(JSON.stringify(item)).tournament,
    );
    const valid = items.filter(
      (item: Tournament | null): item is Tournament => item !== null && item.phase === 'complete',
    );
    return { items: valid.length === items.length ? valid : [], blocked: false };
  } catch {
    return { items: [], blocked: true };
  }
}
export function saveHistory(items: Tournament[]): { blocked: boolean } {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ v: 3, items: items.map((item) => JSON.parse(encodeTournament(item))) }),
    );
    return { blocked: false };
  } catch {
    return { blocked: true };
  }
}
