import { decodeTournament, encodeTournament } from './format.ts';
import type { Tournament } from './rules.ts';
import { isJsonObject } from '../saved-format.ts';

const KEY = 'np3:tournaments';
export function readHistory(): { items: Tournament[]; unavailable: boolean } {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return { items: [], unavailable: false };
    const value: unknown = JSON.parse(text);
    if (
      !isJsonObject(value) ||
      Object.keys(value).length !== 2 ||
      value.v !== 3 ||
      !Array.isArray(value.items) ||
      value.items.length > 10
    )
      return { items: [], unavailable: false };
    const items: Tournament[] = [];
    for (const item of value.items) {
      const decoded = decodeTournament(JSON.stringify(item)).document;
      if (!decoded || !decoded.tournament || decoded.tournament.phase !== 'complete')
        return { items: [], unavailable: false };
      items.push(decoded.tournament);
    }
    return { items, unavailable: false };
  } catch (error) {
    return { items: [], unavailable: !(error instanceof SyntaxError) };
  }
}
export function saveHistory(items: Tournament[]): { saved: boolean } {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        v: 3,
        items: items.map((tournament) =>
          JSON.parse(encodeTournament({ tournament, snapshot: null })),
        ),
      }),
    );
    return { saved: true };
  } catch {
    return { saved: false };
  }
}
