import { decodeSnapshot } from '../snapshot.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  parseJson,
} from '../saved-format.ts';
import { acceptedNames, normalizePlayerName } from './model.ts';
import type { TournamentPlayer, TournamentRecord, TournamentState } from './model.ts';
import { readTournamentMatches } from './validation-matches.ts';
import { isValidTournamentGame, isValidTournamentProgress } from './validation-progress.ts';

const RECORD_KEYS = ['championSeed', 'currentMatch', 'currentTurn', 'matches', 'players', 'status'];
const STATE_KEYS = ['activeGame', ...RECORD_KEYS];
const SNAPSHOT_KEYS = [
  'boardCode',
  'elapsedMs',
  'matched',
  'moves',
  'selection',
  'started',
  'version',
];

export function findUnknownTournamentField(text: string): string | null {
  if (text.length > 262_144) return null;
  const root = parseJson(text);
  if (!isJsonObject(root)) return null;
  const rootField = unknownField(root, ['format', 'tournament', 'version']);
  if (rootField) return rootField;
  const event = root.tournament;
  if (!isJsonObject(event)) return null;
  const setup = event.kind === 'setup';
  const eventField = unknownField(event, setup ? ['kind', 'names', 'players'] : STATE_KEYS);
  if (eventField) return eventField;
  if (setup) return null;
  if (Array.isArray(event.players)) {
    for (const player of event.players) {
      const field = unknownField(player, ['name', 'seed']);
      if (field) return field;
    }
  }
  if (Array.isArray(event.matches)) {
    for (const match of event.matches) {
      const field = unknownField(match, MATCH_FIELD_NAMES);
      if (field) return field;
      if (isJsonObject(match) && Array.isArray(match.results)) {
        for (const result of match.results) {
          const resultField = unknownField(result, ['elapsedMs', 'moves', 'seed']);
          if (resultField) return resultField;
        }
      }
    }
  }
  if (typeof event.activeGame === 'string') return snapshotUnknownField(event.activeGame);
  return null;
}

function unknownField(value: unknown, allowed: readonly string[]): string | null {
  if (!isJsonObject(value)) return null;
  return Object.keys(value).find((key) => !allowed.includes(key)) ?? null;
}

function snapshotUnknownField(text: string): string | null {
  const snapshot = parseJson(text);
  if (!isJsonObject(snapshot)) return null;
  const field = unknownField(snapshot, SNAPSHOT_KEYS);
  if (field) return field;
  const selection = snapshot.selection;
  if (!isJsonObject(selection)) return null;
  const keys =
    selection.kind === 'mismatch'
      ? ['first', 'kind', 'remainingMs', 'second']
      : selection.kind === 'one'
        ? ['index', 'kind']
        : ['kind'];
  return unknownField(selection, keys);
}

const MATCH_FIELD_NAMES = [
  'boardCode',
  'feeders',
  'matchNumber',
  'playerSeeds',
  'results',
  'round',
  'size',
  'winnerSeed',
];

export function readTournamentRecord(value: unknown): TournamentRecord | null {
  if (!isJsonObject(value) || !hasExactKeys(value, RECORD_KEYS) || value.status !== 'finished')
    return null;
  const state = readTournamentFields(value, null);
  if (!state || state.status !== 'finished' || state.championSeed === null) return null;
  const { status, players, matches, currentMatch, currentTurn, championSeed } = state;
  return { status, players, matches, currentMatch, currentTurn, championSeed };
}

export function readTournamentState(value: unknown): TournamentState | null {
  if (!isJsonObject(value) || !hasExactKeys(value, STATE_KEYS)) return null;
  const gameText = value.activeGame;
  if (gameText !== null && typeof gameText !== 'string') return null;
  const game = typeof gameText === 'string' ? decodeSnapshot(gameText) : null;
  if (typeof gameText === 'string' && !game) return null;
  const state = readTournamentFields(value, game);
  return state && isValidTournamentGame(state) ? state : null;
}

function readTournamentFields(
  value: Record<string, unknown>,
  game: TournamentState['activeGame'],
): TournamentState | null {
  const currentMatch = value.currentMatch;
  const currentTurn = value.currentTurn;
  const status = value.status;
  const championSeed = value.championSeed;
  if (
    !isNonnegativeSafeInteger(currentMatch) ||
    !isNonnegativeSafeInteger(currentTurn) ||
    (currentTurn !== 0 && currentTurn !== 1) ||
    (status !== 'active' && status !== 'finished') ||
    !(championSeed === null || isNonnegativeSafeInteger(championSeed))
  )
    return null;
  const players = readPlayers(value.players);
  if (!players) return null;
  const matches = readTournamentMatches(value.matches, players.length);
  if (
    !matches ||
    !isValidTournamentProgress(
      players.length,
      matches,
      currentMatch,
      currentTurn,
      status,
      championSeed,
    )
  )
    return null;
  return {
    status,
    players,
    matches,
    currentMatch,
    currentTurn,
    activeGame: game,
    turnRunning: false,
    championSeed,
  };
}

function readPlayers(value: unknown): TournamentPlayer[] | null {
  if (!Array.isArray(value) || (value.length !== 4 && value.length !== 8)) return null;
  const players: TournamentPlayer[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item: unknown = value[index];
    if (!isJsonObject(item) || !hasExactKeys(item, ['name', 'seed'])) return null;
    const nameValue = item.name;
    const seed = item.seed;
    if (typeof nameValue !== 'string' || !isNonnegativeSafeInteger(seed) || seed !== index + 1)
      return null;
    const name = normalizePlayerName(nameValue);
    if (name !== nameValue || !acceptedNames([name], 1)) return null;
    players.push({ name, seed });
  }
  return acceptedNames(
    players.map((player) => player.name),
    players.length,
  )
    ? players
    : null;
}
