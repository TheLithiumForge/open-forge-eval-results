import { isJsonObject, parseJson } from '../saved-format.ts';

const EVENT_KEYS = [
  'createdAt',
  'currentMatchIndex',
  'currentTurn',
  'finishedAt',
  'game',
  'gameElapsedMs',
  'kind',
  'matches',
  'phase',
  'playerCount',
  'players',
];
const MATCH_KEYS = [
  'advanceTo',
  'boardCode',
  'number',
  'playerSeeds',
  'results',
  'round',
  'size',
  'winnerSeed',
];

export function unknownTournamentField(text: string): string | null {
  const root = parseJson(text);
  if (!isJsonObject(root)) return null;
  const rootField = unknownKey(root, ['data', 'format', 'version']);
  if (rootField) return rootField;
  if (!isJsonObject(root.data)) return null;
  if (root.data.kind === 'setup') return unknownKey(root.data, ['kind', 'names', 'playerCount']);
  if (root.data.kind !== 'event') return null;
  const eventField = unknownKey(root.data, EVENT_KEYS);
  if (eventField) return eventField;
  if (Array.isArray(root.data.players)) {
    for (const player of root.data.players) {
      const field = isJsonObject(player) ? unknownKey(player, ['name', 'seed']) : null;
      if (field) return field;
    }
  }
  if (Array.isArray(root.data.matches)) {
    for (const match of root.data.matches) {
      const field = scanMatch(match);
      if (field) return field;
    }
  }
  if (isJsonObject(root.data.game)) return scanGame(root.data.game);
  return null;
}

function scanMatch(value: unknown): string | null {
  if (!isJsonObject(value)) return null;
  const field = unknownKey(value, MATCH_KEYS);
  if (field) return field;
  if (isJsonObject(value.advanceTo)) {
    const nested = unknownKey(value.advanceTo, ['matchIndex', 'slot']);
    if (nested) return nested;
  }
  if (Array.isArray(value.results)) {
    for (const result of value.results) {
      if (!isJsonObject(result)) continue;
      const nested = unknownKey(result, ['elapsedMs', 'moves']);
      if (nested) return nested;
    }
  }
  return null;
}

function scanGame(value: Record<string, unknown>): string | null {
  const field = unknownKey(value, [
    'boardCode',
    'elapsedMs',
    'matched',
    'moves',
    'selection',
    'started',
    'version',
  ]);
  if (field || !isJsonObject(value.selection)) return field;
  const kind = value.selection.kind;
  const fields =
    kind === 'one'
      ? ['index', 'kind']
      : kind === 'mismatch'
        ? ['first', 'kind', 'remainingMs', 'second']
        : ['kind'];
  return unknownKey(value.selection, fields);
}

function unknownKey(value: Record<string, unknown>, allowed: readonly string[]): string | null {
  return Object.keys(value).find((key) => !allowed.includes(key)) ?? null;
}
