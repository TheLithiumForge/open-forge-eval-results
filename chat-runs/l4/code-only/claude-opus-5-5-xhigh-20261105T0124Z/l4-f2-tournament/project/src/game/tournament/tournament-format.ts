import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, isWon, MOVES_MAX } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from '../saved-format.ts';
import { isPlayerCount, NAME_MAX_CHARACTERS, nextTurn, rosterProblem } from './bracket.ts';
import type { GameState } from '../game.ts';
import type { Match, Tournament, TurnResult } from './bracket.ts';

export const TOURNAMENT_VERSION = 1;
export const TOURNAMENT_MAX_BYTES = 65_536;
const TOURNAMENT_KEYS = ['version', 'players', 'matches', 'stage', 'game'];
const MATCH_KEYS = ['boardCode', 'results'];
const RESULT_KEYS = ['moves', 'elapsedMs'];

// Setup holds draft names. Ready waits for Start turn, playing carries the turn's progress and
// ended means the last turn finished and waits for Next turn or Next match.
export const TournamentStage = {
  setup: 'setup',
  ready: 'ready',
  playing: 'playing',
  ended: 'ended',
} as const;
export type TournamentStageKind = (typeof TournamentStage)[keyof typeof TournamentStage];

export interface SavedTournament extends Tournament {
  readonly stage: TournamentStageKind;
  readonly game: GameState | null;
}

export function tournamentValue(saved: SavedTournament): Record<string, unknown> {
  return {
    version: TOURNAMENT_VERSION,
    players: saved.players,
    matches: saved.matches,
    stage: saved.stage,
    game: saved.game ? parseJson(encodeSnapshot(saved.game)) : null,
  };
}

export function encodeTournament(saved: SavedTournament): string {
  return JSON.stringify(tournamentValue(saved), null, 2);
}

export function decodeTournament(text: string): SavedTournament | null {
  return isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? readSavedTournament(parseJson(text)) : null;
}

export function readSavedTournament(value: unknown): SavedTournament | null {
  if (!isJsonObject(value) || !hasExactKeys(value, TOURNAMENT_KEYS)) return null;
  if (value.version !== TOURNAMENT_VERSION || !isNameList(value.players)) return null;
  const players = [...value.players];
  if (value.stage === TournamentStage.setup)
    return Array.isArray(value.matches) && value.matches.length === 0 && value.game === null
      ? { players, matches: [], stage: TournamentStage.setup, game: null }
      : null;
  if (players.some((name) => name !== name.trim()) || rosterProblem(players)) return null;
  const matches = readMatches(value.matches, players.length);
  if (!matches) return null;
  const tournament = { players, matches };
  const turn = nextTurn(tournament);
  switch (value.stage) {
    case TournamentStage.ready:
      return turn && value.game === null ? { ...tournament, stage: value.stage, game: null } : null;
    case TournamentStage.ended:
      return matches[0]?.results[0] && value.game === null
        ? { ...tournament, stage: value.stage, game: null }
        : null;
    case TournamentStage.playing: {
      const game = turn && value.game !== null ? decodeSnapshot(JSON.stringify(value.game)) : null;
      if (!turn || !game || isWon(game) || game.boardCode !== matches[turn.match]?.boardCode)
        return null;
      return { ...tournament, stage: value.stage, game };
    }
    default:
      return null;
  }
}

function isNameList(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    isPlayerCount(value.length) &&
    value.every((name) => typeof name === 'string' && name.length <= NAME_MAX_CHARACTERS)
  );
}

// Turns are played in match order, first seat then second, so results fill a prefix of the turns.
function readMatches(value: unknown, playerCount: number): readonly Match[] | null {
  if (!Array.isArray(value) || value.length !== playerCount - 1) return null;
  const matches: Match[] = [];
  let open = false;
  for (const match of value) {
    if (!isJsonObject(match) || !hasExactKeys(match, MATCH_KEYS)) return null;
    const { boardCode, results: slots } = match;
    if (typeof boardCode !== 'string' || !Array.isArray(slots) || slots.length !== 2) return null;
    const board = parseBoardCode(boardCode);
    if (!board) return null;
    const results: (TurnResult | null)[] = [];
    for (const slot of slots) {
      const result = slot === null ? null : readResult(slot, board.size ** 2 / 2);
      if (slot !== null && (!result || open)) return null;
      open ||= result === null;
      results.push(result);
    }
    const [first = null, second = null] = results;
    matches.push({ boardCode, results: [first, second] });
  }
  return matches;
}

function readResult(value: unknown, pairs: number): TurnResult | null {
  if (!isJsonObject(value) || !hasExactKeys(value, RESULT_KEYS)) return null;
  const { moves, elapsedMs } = value;
  return isNonnegativeSafeInteger(moves) &&
    moves >= pairs &&
    moves <= MOVES_MAX &&
    isNonnegativeSafeInteger(elapsedMs) &&
    elapsedMs <= ELAPSED_MAX_MS
    ? { moves, elapsedMs }
    : null;
}
