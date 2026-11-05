import { readTournament, exportTournament } from './format.ts';
import type { TournamentData } from './rules.ts';

const KEY = 'np3:tournaments';
export function readHistory(): { items: TournamentData[]; blocked: boolean } {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return { items: [], blocked: false };
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return { items: [], blocked: false };
    if (!('v' in value) || !('items' in value)) return { items: [], blocked: false };
    const envelope = value;
    if (
      Object.keys(value).sort().join(',') !== 'items,v' ||
      envelope.v !== 3 ||
      !Array.isArray(envelope.items) ||
      envelope.items.length > 10
    )
      return { items: [], blocked: false };
    const items = envelope.items.map((item: unknown) => readTournament(JSON.stringify(item)).data);
    if (items.some((item: TournamentData | null) => !item || item.phase !== 'complete'))
      return { items: [], blocked: false };
    return { items: items.filter((item): item is TournamentData => item !== null), blocked: false };
  } catch (error) {
    return { items: [], blocked: !(error instanceof SyntaxError) };
  }
}
export function saveHistory(items: TournamentData[]): { saved: boolean } {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        v: 3,
        items: items.slice(0, 10).map((item) => JSON.parse(exportTournament(item))),
      }),
    );
    return { saved: true };
  } catch {
    return { saved: false };
  }
}
