import { ELAPSED_MAX_MS, isWon } from '../game.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { TOURNAMENT_FORMAT, TOURNAMENT_FORMAT_VERSION } from './types.ts';
import {
  isPlayerCount,
  readTournamentMatches,
  readTournamentPlayers,
} from './validation-matches.ts';
import type { GameState } from '../game.ts';
import type { PastTournament, TournamentSetup, TournamentState } from './types.ts';

const SETUP_KEYS = ['format', 'names', 'playerCount', 'state', 'version'] as const;
const EVENT_KEYS = [
  'activeMatch',
  'format',
  'game',
  'matches',
  'phase',
  'playerCount',
  'players',
  'state',
  'turnIndex',
  'version',
] as const;
const PAST_KEYS = ['championSeed', 'matches', 'playerCount', 'players'] as const;

export function readTournamentSetup(value: unknown): TournamentSetup | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, SETUP_KEYS) ||
    value.format !== TOURNAMENT_FORMAT ||
    value.version !== TOURNAMENT_FORMAT_VERSION ||
    value.state !== 'setup' ||
    !isPlayerCount(value.playerCount)
  )
    return null;
  const names = readDraftNames(value.names);
  return names ? { playerCount: value.playerCount, names } : null;
}

export function readTournamentState(value: unknown): TournamentState | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, EVENT_KEYS) ||
    value.format !== TOURNAMENT_FORMAT ||
    value.version !== TOURNAMENT_FORMAT_VERSION ||
    value.state !== 'tournament' ||
    !isPlayerCount(value.playerCount) ||
    !isNonnegativeSafeInteger(value.activeMatch) ||
    (value.turnIndex !== 0 && value.turnIndex !== 1) ||
    !isTournamentPhase(value.phase) ||
    !isJsonObject(value.game)
  )
    return null;
  const players = readTournamentPlayers(value.players, value.playerCount);
  const matches = readTournamentMatches(value.matches, value.playerCount);
  const game = readTournamentGame(value.game);
  if (!players || !matches || !game || value.activeMatch >= matches.length) return null;
  const active = matches[value.activeMatch];
  if (!active || active.players[0] === null || active.players[1] === null) return null;
  if (game.boardCode !== active.boardCode || game.size !== active.size) return null;
  if (!validMatchProgress(matches, value.activeMatch)) return null;
  if (!validCurrentTurn(value.phase, value.turnIndex, value.activeMatch, matches, game))
    return null;
  return {
    playerCount: value.playerCount,
    players,
    matches,
    activeMatch: value.activeMatch,
    turnIndex: value.turnIndex,
    phase: value.phase,
    game,
  };
}

export function readPastTournament(value: unknown): PastTournament | null {
  if (!isJsonObject(value) || !hasExactKeys(value, PAST_KEYS) || !isPlayerCount(value.playerCount))
    return null;
  const players = readTournamentPlayers(value.players, value.playerCount);
  const matches = readTournamentMatches(value.matches, value.playerCount);
  if (!players || !matches || !isNonnegativeSafeInteger(value.championSeed)) return null;
  if (matches.some((match) => match.winnerSeed === null)) return null;
  const final = matches[matches.length - 1];
  if (!final || final.winnerSeed !== value.championSeed) return null;
  return { playerCount: value.playerCount, players, matches, championSeed: value.championSeed };
}

function readDraftNames(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length !== 8) return null;
  const names: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const name: unknown = value[index];
    if (typeof name !== 'string' || Array.from(name).length > 256) return null;
    names.push(name);
  }
  return names;
}

function validMatchProgress(
  matches: TournamentState['matches'],
  activeIndex: number,
): boolean {
  return matches.every((match, index) => {
    if (index < activeIndex) return match.winnerSeed !== null;
    if (index > activeIndex) {
      return (
        match.winnerSeed === null &&
        match.results[0] === null &&
        match.results[1] === null
      );
    }
    return true;
  });
}

function validCurrentTurn(
  phase: TournamentState['phase'],
  turn: TournamentState['turnIndex'],
  activeIndex: number,
  matches: TournamentState['matches'],
  game: GameState,
): boolean {
  const match = matches[activeIndex];
  if (!match) return false;
  const [first, second] = match.results;
  if (phase === 'ready') {
    const attemptsReady =
      turn === 0 ? first === null && second === null : first !== null && second === null;
    return attemptsReady && !game.started && game.moves === 0 && game.matched.length === 0;
  }
  if (phase === 'playing') {
    const attemptsReady =
      turn === 0 ? first === null && second === null : first !== null && second === null;
    return attemptsReady && !isWon(game);
  }
  if (phase === 'between-turns') {
    return (
      turn === 0 &&
      first !== null &&
      second === null &&
      isWon(game) &&
      sameResult(first, game)
    );
  }
  if (phase === 'between-matches') {
    return (
      turn === 1 &&
      first !== null &&
      second !== null &&
      activeIndex < matches.length - 1 &&
      isWon(game) &&
      sameResult(second, game)
    );
  }
  return (
    phase === 'finished' &&
    turn === 1 &&
    first !== null &&
    second !== null &&
    activeIndex === matches.length - 1 &&
    isWon(game) &&
    sameResult(second, game)
  );
}

function sameResult(
  result: NonNullable<TournamentState['matches'][number]['results'][number]>,
  game: GameState,
) {
  return result.moves === game.moves && result.elapsedMs === game.elapsedMs;
}

function readTournamentGame(value: Record<string, unknown>): GameState | null {
  const elapsedMs = value.elapsedMs;
  if (
    typeof elapsedMs !== 'number' ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < 0 ||
    elapsedMs > ELAPSED_MAX_MS
  )
    return null;
  const text = JSON.stringify({ ...value, elapsedMs: Math.floor(elapsedMs) });
  if (!text) return null;
  const game = decodeSnapshot(text);
  return game ? { ...game, elapsedMs } : null;
}

function isTournamentPhase(value: unknown): value is TournamentState['phase'] {
  return (
    value === 'ready' ||
    value === 'playing' ||
    value === 'between-turns' ||
    value === 'between-matches' ||
    value === 'finished'
  );
}
