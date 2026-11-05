import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { ELAPSED_MAX_MS } from '../game.ts';
import type { MatchResult, RoundName, TournamentMatch, TournamentRound } from './rules.ts';

function playerSlot(value: unknown): string | null | undefined {
  if (value === null || typeof value === 'string') return value;
  return undefined;
}

function roundName(value: unknown): RoundName | null {
  return value === 'Quarterfinal' || value === 'Semifinal' || value === 'Final' ? value : null;
}

function readResult(value: unknown): MatchResult | null | undefined {
  if (value === null) return null;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['elapsedMs', 'moves', 'name']) ||
    typeof value.name !== 'string' ||
    !isNonnegativeSafeInteger(value.moves) ||
    typeof value.elapsedMs !== 'number' ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return undefined;
  return { name: value.name, moves: value.moves, elapsedMs: value.elapsedMs };
}

function readMatch(value: unknown): TournamentMatch | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['boardCode', 'players', 'results', 'winner']) ||
    typeof value.boardCode !== 'string' ||
    !Array.isArray(value.players) ||
    value.players.length !== 2 ||
    !Array.isArray(value.results) ||
    value.results.length !== 2
  )
    return null;
  const firstPlayer = playerSlot(value.players[0]);
  const secondPlayer = playerSlot(value.players[1]);
  const firstResult = readResult(value.results[0]);
  const secondResult = readResult(value.results[1]);
  if (
    firstPlayer === undefined ||
    secondPlayer === undefined ||
    firstResult === undefined ||
    secondResult === undefined ||
    (value.winner !== null && typeof value.winner !== 'string')
  )
    return null;
  return {
    boardCode: value.boardCode,
    players: [firstPlayer, secondPlayer],
    results: [firstResult, secondResult],
    winner: value.winner,
  };
}

export function readRound(value: unknown): TournamentRound | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['matches', 'name', 'size']) ||
    typeof value.name !== 'string' ||
    typeof value.size !== 'number' ||
    !Array.isArray(value.matches)
  )
    return null;
  const name = roundName(value.name);
  if (!name) return null;
  const matches: TournamentMatch[] = [];
  for (const entry of value.matches) {
    const match = readMatch(entry);
    if (!match) return null;
    matches.push(match);
  }
  return { name, size: value.size, matches };
}
