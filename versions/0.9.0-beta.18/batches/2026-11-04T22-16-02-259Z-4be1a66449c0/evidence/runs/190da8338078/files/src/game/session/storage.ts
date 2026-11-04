import { isBoardSize, MOVE_CAP, SUPPORTED_SIZES, type BoardSize } from '../types.ts';

const SIZE_KEY = 'neon-pairs.last-size.v1';
const BEST_KEY = 'neon-pairs.best-moves.v1';
export type BestRecords = Readonly<Partial<Record<BoardSize, number>>>;

export function readLastSize(): BoardSize | null {
  try {
    const raw = browserStorage()?.getItem(SIZE_KEY);
    if (raw === null || raw === undefined) return null;
    const value: unknown = JSON.parse(raw);
    return isBoardSize(value) ? value : null;
  } catch { return null; }
}

export function saveLastSize(size: BoardSize): void {
  try { browserStorage()?.setItem(SIZE_KEY, JSON.stringify(size)); } catch { /* Storage is optional. */ }
}

export function readBestRecords(): BestRecords {
  try {
    const raw = browserStorage()?.getItem(BEST_KEY);
    if (raw === null || raw === undefined) return Object.freeze({});
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return Object.freeze({});
    const records: Partial<Record<BoardSize, number>> = {};
    for (const size of SUPPORTED_SIZES) {
      const score = value[String(size)];
      if (typeof score === 'number' && Number.isSafeInteger(score) && score >= 0 && score <= MOVE_CAP) records[size] = score;
    }
    return Object.freeze(records);
  } catch { return Object.freeze({}); }
}

export function saveBestIfBetter(size: BoardSize, moves: number): BestRecords {
  const current = readBestRecords();
  const best = current[size];
  if (best !== undefined && best <= moves) return current;
  const updated = Object.freeze({ ...current, [size]: moves });
  try { browserStorage()?.setItem(BEST_KEY, JSON.stringify(updated)); } catch { return current; }
  return updated;
}

function browserStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
