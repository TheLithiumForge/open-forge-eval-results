import { validateTournamentLogic } from './validate-logic.ts';
import { isTimestamp, objectWithKeys } from './validation-helpers.ts';
import type {
  Round,
  TournamentMatch,
  TournamentPlayer,
  TournamentState,
  TurnResult,
} from './types.ts';

const STATE_KEYS = [
  'activePlayer',
  'championSeed',
  'completedAt',
  'createdAt',
  'currentGame',
  'currentMatchIndex',
  'matches',
  'phase',
  'playerCount',
  'players',
];
const MATCH_KEYS = ['boardCode', 'next', 'players', 'results', 'round', 'winnerSeed'];
const PLAYER_KEYS = ['name', 'seed'];
const RESULT_KEYS = ['elapsedMs', 'moves'];
const NEXT_KEYS = ['matchIndex', 'playerSlot'];
const PHASES: readonly string[] = [
  'ready',
  'playing',
  'betweenTurns',
  'betweenMatches',
  'complete',
];

type StateValidation = { readonly state: TournamentState } | { readonly message: string };

export function validateTournamentState(value: unknown): StateValidation {
  try {
    return validate(value);
  } catch (error) {
    return { message: error instanceof Error ? error.message : 'Invalid tournament.' };
  }
}

function validate(value: unknown): StateValidation {
  const raw = objectWithKeys(value, STATE_KEYS);
  if (!raw) return { message: 'Invalid tournament.' };
  const activePlayer = raw.activePlayer;
  const championSeed = raw.championSeed;
  const completedAt = raw.completedAt;
  const createdAt = raw.createdAt;
  const currentGame = raw.currentGame;
  const currentMatchIndex = raw.currentMatchIndex;
  const phase = raw.phase;
  const playerCount = raw.playerCount;
  const playerValues = raw.players;
  const matchValues = raw.matches;
  if (
    !isPlayerCount(playerCount) ||
    !Array.isArray(playerValues) ||
    !Array.isArray(matchValues) ||
    !isInteger(currentMatchIndex) ||
    (activePlayer !== 0 && activePlayer !== 1) ||
    !isTournamentPhase(phase) ||
    (currentGame !== null && typeof currentGame !== 'string') ||
    (championSeed !== null && !isSafeInteger(championSeed)) ||
    (completedAt !== null && !isTimestamp(completedAt)) ||
    !isTimestamp(createdAt)
  )
    return { message: 'Invalid tournament.' };

  const players = parsePlayers(playerValues);
  if (!players) return { message: 'Invalid tournament.' };
  const matches = parseMatches(matchValues);
  if (!matches) return { message: 'Invalid tournament.' };
  const state: TournamentState = {
    activePlayer,
    championSeed,
    completedAt,
    createdAt,
    currentGame,
    currentMatchIndex,
    matches,
    phase,
    playerCount,
    players,
  };
  const semanticError = validateTournamentLogic(state, players, matches);
  if (semanticError) return { message: semanticError };
  return { state: { ...state, players, matches } };
}

function parsePlayers(value: readonly unknown[]): TournamentPlayer[] | null {
  const players: TournamentPlayer[] = [];
  for (const item of value) {
    const raw = objectWithKeys(item, PLAYER_KEYS);
    if (typeof raw?.name !== 'string' || !isSafeInteger(raw.seed)) return null;
    players.push({ name: raw.name, seed: raw.seed });
  }
  return players;
}

function parseMatches(value: readonly unknown[]): TournamentMatch[] | null {
  const matches: TournamentMatch[] = [];
  for (const item of value) {
    const raw = objectWithKeys(item, MATCH_KEYS);
    if (
      !raw ||
      typeof raw.boardCode !== 'string' ||
      !isRound(raw.round) ||
      !Array.isArray(raw.players) ||
      raw.players.length !== 2 ||
      !Array.isArray(raw.results) ||
      raw.results.length !== 2
    )
      return null;
    const firstSeed = raw.players[0];
    const secondSeed = raw.players[1];
    if (!isSeedOrNull(firstSeed) || !isSeedOrNull(secondSeed)) return null;
    const first = parseResult(raw.results[0]);
    const second = parseResult(raw.results[1]);
    if (first === undefined || second === undefined) return null;
    const next = parseNext(raw.next);
    if (next === undefined || !isSeedOrNull(raw.winnerSeed)) return null;
    matches.push({
      boardCode: raw.boardCode,
      next,
      players: [firstSeed, secondSeed],
      results: [first, second],
      round: raw.round,
      winnerSeed: raw.winnerSeed,
    });
  }
  return matches;
}

function parseResult(value: unknown): TurnResult | null | undefined {
  if (value === null) return null;
  const raw = objectWithKeys(value, RESULT_KEYS);
  if (!raw || !isSafeInteger(raw.moves) || typeof raw.elapsedMs !== 'number') return undefined;
  return { elapsedMs: raw.elapsedMs, moves: raw.moves };
}

function parseNext(value: unknown): TournamentMatch['next'] | undefined {
  if (value === null) return null;
  const raw = objectWithKeys(value, NEXT_KEYS);
  if (!raw || !isInteger(raw.matchIndex) || !isPlayerSlot(raw.playerSlot)) return undefined;
  return { matchIndex: raw.matchIndex, playerSlot: raw.playerSlot };
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isPlayerCount(value: unknown): value is 4 | 8 {
  return value === 4 || value === 8;
}

function isPlayerSlot(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
}

function isSeedOrNull(value: unknown): value is number | null {
  return value === null || isSafeInteger(value);
}

function isRound(value: unknown): value is Round {
  return value === 'Quarterfinal' || value === 'Semifinal' || value === 'Final';
}

function isTournamentPhase(value: unknown): value is TournamentState['phase'] {
  return typeof value === 'string' && PHASES.includes(value);
}
