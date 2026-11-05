import { SNAPSHOT_KEYS, SNAPSHOT_VERSION } from '../snapshot.ts';
import { isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { SelectionKind } from '../selection.ts';
import { TOURNAMENT_FORMAT, TOURNAMENT_FORMAT_VERSION } from './types.ts';
import { readTournamentSetup, readTournamentState } from './validation.ts';
import type { TournamentImport, TournamentSetup, TournamentState } from './types.ts';
import type { GameState } from '../game.ts';

export const TOURNAMENT_JSON_MAX_BYTES = 65_536;
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
const MATCH_KEYS = [
  'boardCode',
  'id',
  'number',
  'players',
  'results',
  'round',
  'size',
  'winnerSeed',
] as const;

export type TournamentDecodeResult =
  | TournamentImport
  | { readonly kind: 'invalid'; readonly message: string };

export function encodeTournament(
  setup: TournamentSetup,
  tournament: TournamentState | null,
): string {
  if (!tournament) {
    return JSON.stringify(
      {
        format: TOURNAMENT_FORMAT,
        names: [...setup.names],
        playerCount: setup.playerCount,
        state: 'setup',
        version: TOURNAMENT_FORMAT_VERSION,
      },
      null,
      2,
    );
  }
  return JSON.stringify(
    {
      activeMatch: tournament.activeMatch,
      format: TOURNAMENT_FORMAT,
      game: encodeTournamentGame(tournament.game),
      matches: tournament.matches.map((match) => ({
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
      })),
      phase: tournament.phase,
      playerCount: tournament.playerCount,
      players: tournament.players.map((player) => ({ name: player.name, seed: player.seed })),
      state: 'tournament',
      turnIndex: tournament.turnIndex,
      version: TOURNAMENT_FORMAT_VERSION,
    },
    null,
    2,
  );
}

export function decodeTournament(text: string): TournamentDecodeResult {
  const value = isWithinBytes(text, TOURNAMENT_JSON_MAX_BYTES) ? parseJson(text) : undefined;
  if (!isJsonObject(value)) return invalid();
  const unknown = findUnknownTournamentField(value);
  if (unknown) return invalid(`Unknown field: ${unknown}.`);
  if (value.format !== TOURNAMENT_FORMAT) return invalid();
  if (value.state === 'setup') {
    const setup = readTournamentSetup(value);
    return setup ? { kind: 'setup', setup } : invalid();
  }
  if (value.state === 'tournament') {
    const tournament = readTournamentState(value);
    return tournament ? { kind: 'tournament', tournament } : invalid();
  }
  return invalid();
}

function findUnknownTournamentField(root: Record<string, unknown>): string | null {
  const rootKeys =
    root.state === 'setup'
      ? SETUP_KEYS
      : root.state === 'tournament'
        ? EVENT_KEYS
        : [...SETUP_KEYS, ...EVENT_KEYS];
  const rootField = unknownField(root, rootKeys);
  if (rootField) return rootField;
  if (root.state !== 'tournament') return null;

  const snapshot = root.game;
  const snapshotField = unknownField(snapshot, SNAPSHOT_KEYS);
  if (snapshotField) return snapshotField;
  if (isJsonObject(snapshot) && isJsonObject(snapshot.selection)) {
    const kind = snapshot.selection.kind;
    const selectionKeys =
      kind === 'closed'
        ? ['kind']
        : kind === 'one'
          ? ['kind', 'index']
          : kind === 'mismatch'
            ? ['kind', 'first', 'second', 'remainingMs']
            : ['kind', 'index', 'first', 'second', 'remainingMs'];
    const selectionField = unknownField(snapshot.selection, selectionKeys);
    if (selectionField) return selectionField;
  }

  if (Array.isArray(root.matches)) {
    for (const match of root.matches) {
      const matchField = unknownField(match, MATCH_KEYS);
      if (matchField) return matchField;
      if (!isJsonObject(match)) continue;
      const nestedField = findMatchChildUnknownField(match);
      if (nestedField) return nestedField;
    }
  }
  if (Array.isArray(root.players)) {
    for (const player of root.players) {
      const playerField = unknownField(player, ['name', 'seed']);
      if (playerField) return playerField;
    }
  }
  return null;
}

function findMatchChildUnknownField(match: Record<string, unknown>): string | null {
  if (Array.isArray(match.results)) {
    for (const result of match.results) {
      const resultField = unknownField(result, ['elapsedMs', 'moves']);
      if (resultField) return resultField;
    }
  }
  return null;
}

function unknownField(value: unknown, allowedKeys: readonly string[]): string | null {
  if (!isJsonObject(value)) return null;
  const allowed = new Set(allowedKeys);
  return Object.keys(value).find((key) => !allowed.has(key)) ?? null;
}

function encodeTournamentGame(game: GameState) {
  const selection = game.selection;
  const savedSelection =
    selection.kind === SelectionKind.mismatch
      ? {
          first: selection.first,
          kind: selection.kind,
          remainingMs: Math.ceil(selection.remainingMs),
          second: selection.second,
        }
      : selection.kind === SelectionKind.one
        ? { index: selection.index, kind: selection.kind }
        : { kind: selection.kind };
  return {
    boardCode: game.boardCode,
    elapsedMs: game.elapsedMs,
    matched: [...game.matched].sort((left, right) => left - right),
    moves: game.moves,
    selection: savedSelection,
    started: game.started,
    version: SNAPSHOT_VERSION,
  };
}

function invalid(message = 'Invalid tournament JSON.') {
  return { kind: 'invalid' as const, message };
}
