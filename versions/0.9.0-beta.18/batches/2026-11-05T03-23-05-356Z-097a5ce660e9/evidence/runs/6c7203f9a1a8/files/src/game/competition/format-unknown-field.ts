import { isWithinBytes, isJsonObject, parseJson } from '../saved-format.ts';

interface ObjectSchema {
  readonly keys: readonly string[];
  readonly child?: (key: string) => ObjectSchema | undefined;
}

function firstUnknown(value: unknown, schema: ObjectSchema): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const unknown = firstUnknown(item, schema);
      if (unknown) return unknown;
    }
    return null;
  }
  if (!isJsonObject(value)) return null;
  for (const key of Object.keys(value)) {
    if (!schema.keys.includes(key)) return key;
    const child = schema.child?.(key);
    if (child) {
      const unknown = firstUnknown(value[key], child);
      if (unknown) return unknown;
    }
  }
  return null;
}

const selectionSchema: ObjectSchema = {
  keys: ['first', 'index', 'kind', 'remainingMs', 'second'],
};
const gameSchema: ObjectSchema = {
  keys: ['boardCode', 'elapsedMs', 'matched', 'moves', 'selection', 'started', 'version'],
  child: (key) => (key === 'selection' ? selectionSchema : undefined),
};
const setupSchema: ObjectSchema = { keys: ['playerCount', 'players'] };
const resultSchema: ObjectSchema = { keys: ['elapsedMs', 'moves', 'name'] };
const matchSchema: ObjectSchema = {
  keys: ['boardCode', 'players', 'results', 'winner'],
  child: (key) => (key === 'results' ? resultSchema : undefined),
};
const roundSchema: ObjectSchema = {
  keys: ['matches', 'name', 'size'],
  child: (key) => (key === 'matches' ? matchSchema : undefined),
};
const tournamentSchema: ObjectSchema = {
  keys: ['matchIndex', 'playerCount', 'playerIndex', 'phase', 'players', 'roundIndex', 'rounds'],
  child: (key) => (key === 'rounds' ? roundSchema : undefined),
};
const transferSchema: ObjectSchema = {
  keys: ['format', 'game', 'setup', 'tournament', 'version'],
  child: (key) => {
    if (key === 'game') return gameSchema;
    if (key === 'setup') return setupSchema;
    if (key === 'tournament') return tournamentSchema;
    return undefined;
  },
};

export function firstUnknownTournamentField(text: string): string | null {
  const value = isWithinBytes(text, 65_536) ? parseJson(text) : undefined;
  return isJsonObject(value) ? firstUnknown(value, transferSchema) : null;
}
