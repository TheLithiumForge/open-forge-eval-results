import { ELAPSED_MAX_MS, MOVES_MAX, isWon } from '../game.ts';
import { parseBoardCode } from '../deck.ts';
import { isJsonObject, hasExactKeys, isNonnegativeSafeInteger } from '../saved-format.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { nameError, normalizeName } from './names.ts';
import { roundFor } from './rules.ts';
import { TournamentPhase } from './model.ts';
import type { TournamentMatch, TournamentResult, TournamentState } from './model.ts';

function readResult(value: unknown, size: number): TournamentResult | null | undefined {
  if (value === null) return null;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['moves', 'elapsedMs']) ||
    !isNonnegativeSafeInteger(value.moves) ||
    value.moves < size ** 2 / 2 ||
    value.moves > MOVES_MAX ||
    typeof value.elapsedMs !== 'number' ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return undefined;
  return { moves: value.moves, elapsedMs: value.elapsedMs };
}

function readMatch(value: unknown, size: number): TournamentMatch | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['boardCode', 'results']) ||
    typeof value.boardCode !== 'string' ||
    parseBoardCode(value.boardCode)?.size !== size ||
    !Array.isArray(value.results) ||
    value.results.length !== 2
  )
    return null;
  const first = readResult(value.results[0], size);
  const second = readResult(value.results[1], size);
  if (first === undefined || second === undefined) return null;
  return { boardCode: value.boardCode, results: [first, second] };
}

export function readTournament(value: unknown): TournamentState | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['players', 'matches', 'matchIndex', 'turn', 'phase', 'game']) ||
    !Array.isArray(value.players) ||
    (value.players.length !== 4 && value.players.length !== 8)
  )
    return null;
  const players: string[] = [];
  for (const name of value.players) {
    if (typeof name !== 'string' || name !== normalizeName(name)) return null;
    players.push(name);
  }
  if (
    nameError(players) ||
    !Array.isArray(value.matches) ||
    value.matches.length !== players.length - 1
  )
    return null;
  const matches: TournamentMatch[] = [];
  for (const [index, match] of value.matches.entries()) {
    const decoded = readMatch(match, roundFor(players.length, index).size);
    if (!decoded || matches.some((previous) => previous.boardCode === decoded.boardCode))
      return null;
    matches.push(decoded);
  }
  const { matchIndex, turn, phase } = value;
  if (
    !isNonnegativeSafeInteger(matchIndex) ||
    matchIndex >= matches.length ||
    (turn !== 0 && turn !== 1)
  )
    return null;
  if (
    phase !== TournamentPhase.ready &&
    phase !== TournamentPhase.playing &&
    phase !== TournamentPhase.turnFinished &&
    phase !== TournamentPhase.matchFinished &&
    phase !== TournamentPhase.complete
  )
    return null;
  const game = decodeSnapshot(JSON.stringify(value.game));
  const current = matches[matchIndex];
  if (!game || !current || game.boardCode !== current.boardCode) return null;
  const finished =
    phase === TournamentPhase.turnFinished ||
    phase === TournamentPhase.matchFinished ||
    phase === TournamentPhase.complete;
  if (
    isWon(game) !== finished ||
    (phase === TournamentPhase.ready && game.started) ||
    (phase === TournamentPhase.turnFinished && turn !== 0) ||
    ((phase === TournamentPhase.matchFinished || phase === TournamentPhase.complete) &&
      turn !== 1) ||
    (phase === TournamentPhase.complete) !==
      (finished && turn === 1 && matchIndex === matches.length - 1)
  )
    return null;
  for (const [index, match] of matches.entries()) {
    const expected = index < matchIndex ? 2 : index > matchIndex ? 0 : turn + (finished ? 1 : 0);
    if (match.results.some((result, player) => (result !== null) !== player < expected))
      return null;
  }
  const result = current.results[turn];
  if (
    finished &&
    (!result || result.moves !== game.moves || Math.floor(result.elapsedMs) !== game.elapsedMs)
  )
    return null;
  return { players, matches, matchIndex, turn, phase, game };
}

const KEYS: Readonly<Record<string, readonly string[]>> = {
  root: ['format', 'version', 'setup', 'tournament'],
  tournament: ['players', 'matches', 'matchIndex', 'turn', 'phase', 'game'],
  match: ['boardCode', 'results'],
  result: ['moves', 'elapsedMs'],
  game: ['version', 'boardCode', 'matched', 'selection', 'moves', 'elapsedMs', 'started'],
  closed: ['kind'],
  one: ['kind', 'index'],
  mismatch: ['kind', 'first', 'second', 'remainingMs'],
};

export function unknownTournamentField(value: unknown, shape = 'root'): string | null {
  if (!isJsonObject(value)) return null;
  const keys = Object.hasOwn(KEYS, shape) ? KEYS[shape] : undefined;
  if (!keys) return null;
  for (const key of Object.keys(value)) if (!keys.includes(key)) return key;
  const children: readonly [unknown, string][] =
    shape === 'root'
      ? [[value.tournament, 'tournament']]
      : shape === 'tournament'
        ? [
            [value.game, 'game'],
            ...(Array.isArray(value.matches)
              ? value.matches.map((match): [unknown, string] => [match, 'match'])
              : []),
          ]
        : shape === 'match' && Array.isArray(value.results)
          ? value.results.map((result): [unknown, string] => [result, 'result'])
          : shape === 'game' &&
              isJsonObject(value.selection) &&
              typeof value.selection.kind === 'string'
            ? [[value.selection, value.selection.kind]]
            : [];
  for (const [child, childShape] of children) {
    const unknown = unknownTournamentField(child, childShape);
    if (unknown !== null) return unknown;
  }
  return null;
}
