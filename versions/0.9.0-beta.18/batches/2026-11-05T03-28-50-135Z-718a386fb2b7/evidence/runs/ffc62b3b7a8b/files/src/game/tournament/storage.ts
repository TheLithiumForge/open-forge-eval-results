import { decodeTournament, encodeTournament } from './format.ts';
import type { TournamentState } from './tournament.ts';
const KEY = 'np3:tournaments';
export function readHistory(): { items: TournamentState[]; blocked: boolean } {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return { items: [], blocked: false };
    let value: unknown;
    try {
      value = JSON.parse(text);
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
      !Array.isArray(value.items) ||
      value.items.length > 10
    )
      return { items: [], blocked: false };
    const items: TournamentState[] = [];
    for (const item of value.items) {
      const decoded = decodeTournament(
        JSON.stringify({
          format: 'neon-pairs/tournament',
          version: 1,
          tournament: item,
          snapshot: null,
        }),
      ).data?.tournament;
      if (!decoded || decoded.phase !== 'champion') return { items: [], blocked: false };
      items.push(decoded);
    }
    return { items, blocked: false };
  } catch {
    return { items: [], blocked: true };
  }
}
export function saveHistory(items: TournamentState[]): { saved: boolean } {
  try {
    // Reuse the canonical encoder to keep each record's data representation consistent.
    const records = items
      .slice(0, 10)
      .map((item) => JSON.parse(encodeTournament({ tournament: item, snapshot: null })).tournament);
    localStorage.setItem(KEY, JSON.stringify({ v: 3, items: records }));
    return { saved: true };
  } catch {
    return { saved: false };
  }
}
