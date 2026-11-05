import { isJsonObject } from '../saved-format.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { roundSize } from './rules.ts';
import type { TournamentState } from './rules.ts';
import { decodeTournament } from './format.ts';

export const KEY = 'neon-pairs.tournaments.v3';
export function readHistory(): { items: TournamentState[]; blocked: boolean } {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return { items: [], blocked: false };
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return { items: [], blocked: false };
    }
    if (!isJsonObject(data) || Object.keys(data).sort().join(',') !== 'items,v')
      return { items: [], blocked: false };
    const envelope = data;
    if (envelope.v !== 3 || !Array.isArray(envelope.items) || envelope.items.length > 10)
      return { items: [], blocked: false };
    const items: TournamentState[] = [];
    for (const item of envelope.items) {
      const decoded = decodeTournament(
        JSON.stringify({
          format: 'neon-pairs/tournament',
          version: 1,
          tournament: item,
          count: 4,
          drafts: Array(8).fill(''),
        }),
      );
      if (
        typeof decoded === 'string' ||
        !decoded.tournament ||
        decoded.tournament.phase !== 'complete'
      )
        return { items: [], blocked: false };
      items.push(decoded.tournament);
    }
    return { items, blocked: false };
  } catch {
    return { items: [], blocked: true };
  }
}
export function nextCode(t: TournamentState): string {
  let code: string;
  do {
    code = freshBoardCode(roundSize(t.names.length, t.matches.length));
  } while (t.matches.some((match) => match.code === code));
  return code;
}
