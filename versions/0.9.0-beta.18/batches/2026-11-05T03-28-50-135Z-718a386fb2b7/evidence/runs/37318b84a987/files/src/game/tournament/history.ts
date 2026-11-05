import { readTournament } from './format.ts';
import { isJsonObject } from '../saved-format.ts';
import type { Tournament } from './rules.ts';

const KEY = 'np3:tournaments';
export function readHistory(): { items: Tournament[]; blocked: boolean } {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return { items: [], blocked: false };
    const data: unknown = JSON.parse(text);
    if (!isJsonObject(data) || Object.keys(data).sort().join(',') !== 'items,v')
      return { items: [], blocked: false };
    const envelope = data;
    if (envelope.v !== 3 || !Array.isArray(envelope.items) || envelope.items.length > 10)
      return { items: [], blocked: false };
    const items: Tournament[] = [];
    for (const item of envelope.items) {
      const result = readTournament(
        JSON.stringify({ format: 'neon-pairs/tournament', tournament: item, version: 1 }),
      );
      if (!result.value || result.value.phase !== 'complete') return { items: [], blocked: false };
      items.push(result.value);
    }
    return { items, blocked: false };
  } catch (error) {
    return { items: [], blocked: !(error instanceof SyntaxError) };
  }
}
export function saveHistory(items: Tournament[]): { saved: boolean } {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 3, items }));
    return { saved: true };
  } catch {
    return { saved: false };
  }
}
