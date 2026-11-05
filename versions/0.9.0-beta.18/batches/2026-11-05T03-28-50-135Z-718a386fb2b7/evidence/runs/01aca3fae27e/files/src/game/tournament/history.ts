import { isJsonObject } from '../saved-format.ts';
import { isTournament } from './validation.ts';
import type { Tournament } from './model.ts';
const KEY = 'np3:tournaments';
export function readHistory(): { items: Tournament[]; blocked: boolean } {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return { items: [], blocked: false };
    const value: unknown = JSON.parse(text);
    if (!isJsonObject(value)) return { items: [], blocked: false };
    const data = value;
    if (
      Object.keys(data).length !== 2 ||
      data.v !== 3 ||
      !Array.isArray(data.items) ||
      data.items.length > 10 ||
      !data.items.every(
        (item: unknown) =>
          isTournament(item) &&
          item.index === item.matches.length - 1 &&
          item.matches[item.index]!.winner !== null,
      )
    )
      return { items: [], blocked: false };
    return { items: data.items.filter(isTournament), blocked: false };
  } catch (error) {
    return { items: [], blocked: !(error instanceof SyntaxError) };
  }
}
