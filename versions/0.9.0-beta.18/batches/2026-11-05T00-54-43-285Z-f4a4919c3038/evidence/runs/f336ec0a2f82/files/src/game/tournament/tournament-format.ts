import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, isWon, MOVES_MAX } from '../game.ts';
import { decodeSnapshot } from '../snapshot.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from '../saved-format.ts';
import { advanceTournament, createTournament, finishTournamentTurn } from './tournament.ts';
import type { TournamentScore, TournamentState } from './tournament.ts';

export interface TournamentArchive {
  readonly version: 1;
  readonly tournament: TournamentState | null;
  readonly pastTournaments: readonly TournamentState[];
}

export const TOURNAMENT_JSON_LIMIT = 1_048_576;

function readScore(value: unknown, pairs: number): TournamentScore | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['moves', 'elapsedMs']) ||
    !isNonnegativeSafeInteger(value.moves) ||
    value.moves < pairs ||
    value.moves > MOVES_MAX ||
    !isNonnegativeSafeInteger(value.elapsedMs) ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return null;
  return { moves: value.moves, elapsedMs: value.elapsedMs };
}

function readTournament(value: unknown): TournamentState | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, [
      'id',
      'players',
      'matches',
      'currentMatch',
      'turn',
      'phase',
      'snapshot',
    ]) ||
    typeof value.id !== 'string' ||
    !value.id.length ||
    value.id.length > 128 ||
    !Array.isArray(value.players) ||
    (value.players.length !== 4 && value.players.length !== 8) ||
    !Array.isArray(value.matches) ||
    value.matches.length !== value.players.length - 1
  )
    return null;
  const players: string[] = [];
  for (const name of value.players) {
    if (typeof name !== 'string' || !name.trim() || name.length > 80) return null;
    players.push(name);
  }
  const codes: string[] = [];
  const scores: (TournamentScore | null)[] = [];
  let size: number | undefined;
  for (const match of value.matches) {
    if (
      !isJsonObject(match) ||
      !hasExactKeys(match, ['boardCode', 'players', 'results', 'winner']) ||
      typeof match.boardCode !== 'string' ||
      !Array.isArray(match.results) ||
      match.results.length !== 2
    )
      return null;
    const parsed = parseBoardCode(match.boardCode);
    if (!parsed || (size !== undefined && size !== parsed.size)) return null;
    size = parsed.size;
    codes.push(match.boardCode);
    for (const result of match.results) {
      const score = readScore(result, size ** 2 / 2);
      if (result !== null && !score) return null;
      scores.push(score);
    }
  }
  let expected = createTournament(players, codes, value.id);
  let gap = false;
  for (const score of scores) {
    if (!score) {
      gap = true;
      continue;
    }
    if (gap || expected.phase === 'complete') return null;
    expected = finishTournamentTurn(advanceTournament(expected), score);
  }
  if (value.phase === 'ready' || value.phase === 'playing') expected = advanceTournament(expected);
  if (
    value.currentMatch !== expected.currentMatch ||
    value.turn !== expected.turn ||
    (value.phase === 'playing' ? expected.phase !== 'ready' : value.phase !== expected.phase)
  )
    return null;
  // Reconstructing results also checks every participant, propagated winner and pending match.
  for (const [index, match] of value.matches.entries()) {
    const canonical = expected.matches[index];
    if (
      !isJsonObject(match) ||
      !canonical ||
      JSON.stringify(match.players) !== JSON.stringify(canonical.players) ||
      match.winner !== canonical.winner
    )
      return null;
  }
  if (value.snapshot !== null) {
    if (typeof value.snapshot !== 'string' || expected.phase !== 'ready') return null;
    const game = decodeSnapshot(value.snapshot);
    if (!game || isWon(game) || game.boardCode !== codes[expected.currentMatch]) return null;
  } else if (value.phase === 'playing') return null;
  return { ...expected, snapshot: value.snapshot };
}

export function encodeTournament(archive: TournamentArchive): string {
  return JSON.stringify(archive, null, 2);
}

export function decodeTournament(text: string): TournamentArchive | null {
  const value = isWithinBytes(text, TOURNAMENT_JSON_LIMIT) ? parseJson(text) : undefined;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['version', 'tournament', 'pastTournaments']) ||
    value.version !== 1 ||
    !Array.isArray(value.pastTournaments)
  )
    return null;
  const tournament = value.tournament === null ? null : readTournament(value.tournament);
  if (value.tournament !== null && !tournament) return null;
  const pastTournaments: TournamentState[] = [];
  const ids = new Set<string>();
  for (const entry of value.pastTournaments) {
    const past = readTournament(entry);
    if (!past || past.phase !== 'complete' || ids.has(past.id)) return null;
    ids.add(past.id);
    pastTournaments.push(past);
  }
  return { version: 1, tournament, pastTournaments };
}
