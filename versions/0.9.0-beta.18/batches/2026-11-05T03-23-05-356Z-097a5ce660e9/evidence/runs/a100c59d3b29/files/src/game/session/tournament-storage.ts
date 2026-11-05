import { hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { readPastTournament } from '../competition/validation.ts';
import type { PastTournament, TournamentMatch, TournamentPlayer } from '../competition/types.ts';

export const TOURNAMENTS_KEY = 'np3:tournaments';
export const TOURNAMENTS_ENVELOPE_VERSION = 3;
export const TOURNAMENT_HISTORY_LIMIT = 10;

export interface TournamentStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface TournamentHistoryRead {
  readonly items: readonly PastTournament[];
  readonly available: boolean;
}

export function browserTournamentStore(): TournamentStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readTournamentHistory(store: TournamentStore | null): TournamentHistoryRead {
  if (!store) return { items: [], available: false };
  let text: string | null;
  try {
    text = store.getItem(TOURNAMENTS_KEY);
  } catch {
    return { items: [], available: false };
  }
  if (text === null) return { items: [], available: true };
  const value = parseJson(text);
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['items', 'v']) ||
    value.v !== TOURNAMENTS_ENVELOPE_VERSION
  ) {
    return { items: [], available: true };
  }
  if (!Array.isArray(value.items) || value.items.length > TOURNAMENT_HISTORY_LIMIT) {
    return { items: [], available: true };
  }
  const items: PastTournament[] = [];
  for (const item of value.items) {
    const tournament = readPastTournament(item);
    if (!tournament) return { items: [], available: true };
    items.push(tournament);
  }
  return { items, available: true };
}

export function writeTournamentHistory(
  store: TournamentStore | null,
  items: readonly PastTournament[],
): boolean {
  if (!store) return false;
  try {
    store.setItem(
      TOURNAMENTS_KEY,
      JSON.stringify({
        items: items.slice(0, TOURNAMENT_HISTORY_LIMIT).map(serializePast),
        v: TOURNAMENTS_ENVELOPE_VERSION,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function tournamentHistoryKey(tournament: PastTournament): string {
  return JSON.stringify(serializePast(tournament));
}

function serializePast(tournament: PastTournament) {
  return {
    championSeed: tournament.championSeed,
    matches: tournament.matches.map(serializeMatch),
    playerCount: tournament.playerCount,
    players: tournament.players.map(serializePlayer),
  };
}

function serializePlayer(player: TournamentPlayer) {
  return { name: player.name, seed: player.seed };
}

function serializeMatch(match: TournamentMatch) {
  return {
    boardCode: match.boardCode,
    id: match.id,
    number: match.number,
    players: [...match.players],
    results: match.results.map((result) =>
      result ? { elapsedMs: result.elapsedMs, moves: result.moves } : null,
    ),
    round: match.round,
    size: match.size,
    winnerSeed: match.winnerSeed,
  };
}
