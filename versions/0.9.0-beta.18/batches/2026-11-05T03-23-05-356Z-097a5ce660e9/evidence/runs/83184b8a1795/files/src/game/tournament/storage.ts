import { decodeExchange, encodeExchange } from './format.ts';
import { winner } from './model.ts';
import { isJsonObject } from '../saved-format.ts';
import type { TournamentState } from './model.ts';
const KEY = 'np3:tournaments';
export function readTournaments(): { items: TournamentState[]; unavailable: boolean } {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return { items: [], unavailable: false };
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      return { items: [], unavailable: false };
    }
    if (!isJsonObject(value)) return { items: [], unavailable: false };
    const data = value;
    if (
      Object.keys(data).sort().join(',') !== 'items,v' ||
      data.v !== 3 ||
      !Array.isArray(data.items) ||
      data.items.length > 10
    )
      return { items: [], unavailable: false };
    const items: TournamentState[] = [];
    for (const item of data.items) {
      const decoded = decodeExchange(JSON.stringify(item)).data;
      const t = decoded?.tournament,
        last = t?.matches.at(-1);
      if (
        !t ||
        decoded.snapshot !== null ||
        t.matches.length !== t.names.length - 1 ||
        !last ||
        winner(last) === null
      )
        return { items: [], unavailable: false };
      items.push(t);
    }
    return { items, unavailable: false };
  } catch {
    return { items: [], unavailable: true };
  }
}
export function saveTournaments(items: TournamentState[]): { saved: boolean } {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        v: 3,
        items: items.map((t) => JSON.parse(encodeExchange({ tournament: t, snapshot: null }))),
      }),
    );
    return { saved: true };
  } catch {
    return { saved: false };
  }
}
