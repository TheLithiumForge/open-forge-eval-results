import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX, isWon } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from '../saved-format.ts';
import { nameProblem, normalizeName, tournamentStages, TournamentPhase } from './rules.ts';
import type { TournamentState, TurnResult } from './rules.ts';
import { tournamentUnknownField } from './format-fields.ts';

export const TOURNAMENT_MAX_BYTES = 131_072;

export function encodeTournament(state: TournamentState): string {
  const data =
    'deals' in state
      ? {
          deals: state.deals,
          kind: 'tournament',
          names: state.names,
          phase: state.phase,
          results: state.results,
          snapshot: parseJson(encodeSnapshot(state.game)),
        }
      : { kind: 'setup', names: state.names };
  return JSON.stringify(
    { format: 'neon-pairs/tournament', state: data, version: 1 },
    (_key, value: unknown) =>
      isJsonObject(value)
        ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
        : value,
    2,
  );
}

export function decodeTournament(text: string): { state: TournamentState | null; error: string } {
  const value = isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? parseJson(text) : null;
  const unknown = tournamentUnknownField(value);
  const invalid = {
    state: null,
    error: unknown ? `Unknown field: ${unknown}.` : 'Invalid tournament.',
  };
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['format', 'state', 'version']) ||
    value.format !== 'neon-pairs/tournament' ||
    value.version !== 1 ||
    !isJsonObject(value.state)
  )
    return invalid;
  const data = value.state;
  if (
    !Array.isArray(data.names) ||
    (data.names.length !== 4 && data.names.length !== 8) ||
    !data.names.every((name): name is string => typeof name === 'string')
  )
    return invalid;
  const names: string[] = data.names;
  if (data.kind === 'setup' && hasExactKeys(data, ['kind', 'names']))
    return { state: { names }, error: '' };
  if (
    !hasExactKeys(data, ['deals', 'kind', 'names', 'phase', 'results', 'snapshot']) ||
    data.kind !== 'tournament' ||
    nameProblem(names) ||
    names.some((name) => normalizeName(name) !== name) ||
    !Array.isArray(data.deals) ||
    !Array.isArray(data.results) ||
    data.deals.length !== names.length - 1 ||
    new Set(data.deals).size !== data.deals.length
  )
    return invalid;
  const deals: string[] = [];
  const stages = tournamentStages(names.length);
  for (const [index, code] of data.deals.entries()) {
    if (typeof code !== 'string' || parseBoardCode(code)?.size !== stages[index]?.size)
      return invalid;
    deals.push(code);
  }
  const results: TurnResult[] = [];
  if (data.results.length > deals.length * 2) return invalid;
  for (const [index, result] of data.results.entries()) {
    const size = stages[Math.floor(index / 2)]?.size;
    if (
      !size ||
      !isJsonObject(result) ||
      !hasExactKeys(result, ['moves', 'elapsedMs']) ||
      !isNonnegativeSafeInteger(result.moves) ||
      result.moves < size ** 2 / 2 ||
      result.moves > MOVES_MAX ||
      typeof result.elapsedMs !== 'number' ||
      !Number.isFinite(result.elapsedMs) ||
      result.elapsedMs < 0 ||
      result.elapsedMs > ELAPSED_MAX_MS
    )
      return invalid;
    results.push({ moves: result.moves, elapsedMs: result.elapsedMs });
  }
  const phase = data.phase;
  if (
    phase !== TournamentPhase.ready &&
    phase !== TournamentPhase.playing &&
    phase !== TournamentPhase.finished
  )
    return invalid;
  const game = decodeSnapshot(JSON.stringify(data.snapshot));
  const finished = phase === TournamentPhase.finished;
  const index = Math.floor((results.length - (finished ? 1 : 0)) / 2);
  if (!game || index < 0 || game.boardCode !== deals[index] || isWon(game) !== finished)
    return invalid;
  if (finished) {
    const last = results.at(-1);
    if (!last || last.moves !== game.moves || Math.floor(last.elapsedMs) !== game.elapsedMs)
      return invalid;
  }
  return { state: { names, deals, results, phase, game }, error: '' };
}
