import { isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { TOURNAMENT_MAX_BYTES } from './tournament-format.ts';

interface ObjectShape {
  readonly fields: Readonly<Record<string, FieldShape>>;
}

interface ArrayShape {
  readonly arrayOf: FieldShape;
}

interface JsonStringShape {
  readonly jsonString: ObjectShape;
}

type FieldShape = ObjectShape | ArrayShape | JsonStringShape | ((value: unknown) => FieldShape) | null;

const object = (fields: Readonly<Record<string, FieldShape>>): ObjectShape => ({ fields });
const array = (arrayOf: FieldShape): ArrayShape => ({ arrayOf });
const jsonString = (json: ObjectShape): JsonStringShape => ({ jsonString: json });

const player = object({ name: null, seed: null });
const result = object({ elapsedMs: null, moves: null });
const current = object({ match: null, round: null, turn: null });
const selection = (value: unknown): FieldShape => {
  if (!isJsonObject(value)) return null;
  if (value.kind === 'closed') return object({ kind: null });
  if (value.kind === 'one') return object({ index: null, kind: null });
  if (value.kind === 'mismatch')
    return object({ first: null, kind: null, remainingMs: null, second: null });
  return object({ kind: null });
};
const snapshot = object({
  boardCode: null,
  elapsedMs: null,
  matched: null,
  moves: null,
  selection,
  started: null,
  version: null,
});
const match = object({
  boardCode: null,
  players: array(player),
  results: array(result),
  winner: player,
});
const round = object({ matches: array(match), name: null, size: null });
const tournament = object({
  champion: player,
  current,
  entrants: array(player),
  playerCount: null,
  rounds: array(round),
  status: null,
});
const transfer = object({
  draft: object({ playerCount: null, players: null }),
  format: null,
  gameSnapshot: jsonString(snapshot),
  tournament,
  version: null,
});

export function findUnknownTournamentField(text: string): string | null {
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return null;
  return findUnknown(parseJson(text), transfer);
}

function findUnknown(value: unknown, shape: FieldShape): string | null {
  if (typeof shape === 'function') return findUnknown(value, shape(value));
  if (shape === null) return null;
  if ('arrayOf' in shape) {
    if (!Array.isArray(value)) return null;
    for (const item of value) {
      const unknown = findUnknown(item, shape.arrayOf);
      if (unknown) return unknown;
    }
    return null;
  }
  if ('jsonString' in shape) {
    if (typeof value !== 'string') return null;
    return findUnknown(parseJson(value), shape.jsonString);
  }
  if (!isJsonObject(value)) return null;
  for (const key of Object.keys(value)) {
    if (!Object.hasOwn(shape.fields, key)) return key;
  }
  for (const key of Object.keys(value)) {
    const childShape = shape.fields[key];
    if (childShape === undefined) continue;
    const unknown = findUnknown(value[key], childShape);
    if (unknown) return unknown;
  }
  return null;
}
