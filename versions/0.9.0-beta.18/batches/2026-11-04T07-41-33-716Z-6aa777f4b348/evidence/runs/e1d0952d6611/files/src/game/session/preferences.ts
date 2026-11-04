import { GRID_SIZES, type GridSize } from '../deal.ts';
import { MAX_MOVES } from '../state.ts';

const STORAGE_KEY = 'neon-pairs.preferences.v1';
const FORMAT_VERSION = 1;
export type SavedSettings = Readonly<{ size: GridSize; bests: Readonly<Partial<Record<GridSize, number>>> }>;
const DEFAULTS: SavedSettings = { size: 4, bests: {} };
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGridSize(value: unknown): value is GridSize {
  return typeof value === 'number' && GRID_SIZES.some((size) => size === value);
}

function isBest(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_MOVES;
}

export function decodeSettings(text: string): SavedSettings | null {
  try {
    const raw: unknown = JSON.parse(text);
    if (!isRecord(raw) || Object.keys(raw).length !== 3 || raw.version !== FORMAT_VERSION ||
        !Object.hasOwn(raw, 'size') || !Object.hasOwn(raw, 'bests') || !isGridSize(raw.size) ||
        !isRecord(raw.bests)) return null;
    const bests: Partial<Record<GridSize, number>> = {};
    for (const size of GRID_SIZES) {
      const value: unknown = raw.bests[size];
      if (value !== undefined && isBest(value)) bests[size] = value;
    }
    return { size: raw.size, bests };
  } catch { return null; }
}

function getBrowserStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

export function readSettings(): SavedSettings {
  const storage = getBrowserStorage();
  if (storage === null) return DEFAULTS;
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (text === null) return DEFAULTS;
    return decodeSettings(text) ?? DEFAULTS;
  } catch { return DEFAULTS; }
}

export function writeSettings(settings: SavedSettings): void {
  const storage = getBrowserStorage();
  if (storage === null) return;
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ version: FORMAT_VERSION, ...settings })); } catch { /* Storage is optional. */ }
}

export function withBest(settings: SavedSettings, size: GridSize, moves: number): SavedSettings {
  const current = settings.bests[size];
  if (current !== undefined && current <= moves) return settings;
  return { ...settings, bests: { ...settings.bests, [size]: moves } };
}
