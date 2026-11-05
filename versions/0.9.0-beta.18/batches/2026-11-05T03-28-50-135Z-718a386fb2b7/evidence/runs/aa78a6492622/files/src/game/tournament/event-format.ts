import { ELAPSED_MAX_MS, isWon } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  parseJson,
} from '../saved-format.ts';
import { isBracketValid, isProgressValid, readMatches, readPlayers } from './event-shapes.ts';
import type { Tournament, TournamentMatch, TournamentPhase, TournamentResult } from './rules.ts';
import type { GameState } from '../game.ts';

const EVENT_KEYS = [
  'kind',
  'playerCount',
  'players',
  'matches',
  'currentMatchIndex',
  'currentTurn',
  'phase',
  'createdAt',
  'finishedAt',
  'game',
  'gameElapsedMs',
];

export function serializeEvent(tournament: Tournament): Record<string, unknown> {
  return {
    createdAt: tournament.createdAt,
    currentMatchIndex: tournament.currentMatchIndex,
    currentTurn: tournament.currentTurn,
    finishedAt: tournament.finishedAt,
    game: tournament.currentGame ? serializeGame(tournament.currentGame) : null,
    gameElapsedMs: tournament.currentGame?.elapsedMs ?? null,
    kind: 'event',
    matches: tournament.matches.map((match) => ({
      advanceTo: match.advanceTo
        ? { matchIndex: match.advanceTo.matchIndex, slot: match.advanceTo.slot }
        : null,
      boardCode: match.boardCode,
      number: match.number,
      playerSeeds: match.playerSeeds,
      results: match.results.map((result) =>
        result ? { elapsedMs: result.elapsedMs, moves: result.moves } : null,
      ),
      round: match.round,
      size: match.size,
      winnerSeed: match.winnerSeed,
    })),
    phase: tournament.phase,
    playerCount: tournament.playerCount,
    players: tournament.players.map((player) => ({ name: player.name, seed: player.seed })),
  };
}

export function parseEvent(value: unknown): Tournament | null {
  if (!isJsonObject(value) || !hasExactKeys(value, EVENT_KEYS) || value.kind !== 'event')
    return null;
  const count = value.playerCount;
  if (count !== 4 && count !== 8) return null;
  const players = readPlayers(value.players, count);
  const matches = readMatches(value.matches, count);
  const index = value.currentMatchIndex;
  const turn = value.currentTurn;
  const phase = readPhase(value.phase);
  if (
    !players ||
    !matches ||
    !isNonnegativeSafeInteger(index) ||
    index >= matches.length ||
    (turn !== 0 && turn !== 1) ||
    !phase ||
    !isIsoDate(value.createdAt)
  )
    return null;
  const finishedAt = value.finishedAt;
  if (finishedAt !== null && !isIsoDate(finishedAt)) return null;
  if (!isBracketValid(matches, count) || !isProgressValid(matches, index, turn, phase, finishedAt))
    return null;
  const match = matches[index];
  if (!match) return null;
  const game = readCurrentGame(value.game, value.gameElapsedMs, phase, match, match.results[turn]);
  if (game === undefined) return null;
  return {
    playerCount: count,
    players,
    matches,
    currentMatchIndex: index,
    currentTurn: turn,
    phase,
    currentGame: game,
    createdAt: value.createdAt,
    finishedAt,
  };
}

function readCurrentGame(
  snapshot: unknown,
  elapsedMs: unknown,
  phase: TournamentPhase,
  match: TournamentMatch,
  result: TournamentResult | null,
) {
  if (phase !== 'playing' && phase !== 'turnComplete')
    return snapshot === null && elapsedMs === null ? null : undefined;
  if (
    !isJsonObject(snapshot) ||
    typeof elapsedMs !== 'number' ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < 0 ||
    elapsedMs > ELAPSED_MAX_MS
  )
    return undefined;
  const decoded = decodeSnapshot(JSON.stringify(snapshot));
  if (
    !decoded ||
    decoded.boardCode !== match.boardCode ||
    elapsedMs < decoded.elapsedMs ||
    elapsedMs >= decoded.elapsedMs + 1
  )
    return undefined;
  const game = { ...decoded, elapsedMs };
  if (phase === 'playing' && isWon(game)) return undefined;
  if (
    phase === 'turnComplete' &&
    (!isWon(game) || !result || result.moves !== game.moves || result.elapsedMs !== game.elapsedMs)
  )
    return undefined;
  return game;
}

function serializeGame(game: GameState) {
  const snapshot = parseJson(encodeSnapshot(game));
  if (!isJsonObject(snapshot)) throw new Error('Invalid game snapshot.');
  const selection = snapshot.selection;
  if (!isJsonObject(selection)) throw new Error('Invalid game selection.');
  const kind = selection.kind;
  const orderedSelection =
    kind === 'one'
      ? { index: selection.index, kind }
      : kind === 'mismatch'
        ? {
            first: selection.first,
            kind,
            remainingMs: selection.remainingMs,
            second: selection.second,
          }
        : { kind };
  return {
    boardCode: snapshot.boardCode,
    elapsedMs: snapshot.elapsedMs,
    matched: snapshot.matched,
    moves: snapshot.moves,
    selection: orderedSelection,
    started: snapshot.started,
    version: snapshot.version,
  };
}

function readPhase(value: unknown): TournamentPhase | null {
  return value === 'ready' ||
    value === 'playing' ||
    value === 'turnComplete' ||
    value === 'finished'
    ? value
    : null;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
