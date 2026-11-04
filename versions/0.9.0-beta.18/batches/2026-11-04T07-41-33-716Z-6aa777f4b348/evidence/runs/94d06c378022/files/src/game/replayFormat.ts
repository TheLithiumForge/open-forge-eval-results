import { parseBoardCode } from './board.ts';

export const MAX_REPLAY_BYTES = 1_048_576;
export const MAX_REPLAY_ACTIONS = 10_000;
export const REPLAY_VERSION = 1;

export interface ReplayAction {
  readonly atMs: number;
  readonly index: number;
}

export interface ReplayDocument {
  readonly boardCode: string;
  readonly actions: readonly ReplayAction[];
  readonly endMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function safeTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function decodeReplay(text: string): ReplayDocument | null {
  if (new TextEncoder().encode(text).byteLength > MAX_REPLAY_BYTES) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return null; }
  if (!isRecord(parsed) || !hasKeys(parsed, ['version', 'boardCode', 'actions', 'endMs'])) return null;
  if (parsed.version !== REPLAY_VERSION || typeof parsed.boardCode !== 'string' || !safeTime(parsed.endMs)) return null;
  const board = parseBoardCode(parsed.boardCode);
  if (board === null || !Array.isArray(parsed.actions) || parsed.actions.length > MAX_REPLAY_ACTIONS) return null;
  const actions: ReplayAction[] = [];
  let previousTime = 0;
  for (const action of parsed.actions) {
    if (!isRecord(action) || !hasKeys(action, ['atMs', 'index']) || !safeTime(action.atMs)) return null;
    if (!safeTime(action.index) || action.index >= board.deck.length || action.atMs < previousTime) return null;
    actions.push({ atMs: action.atMs, index: action.index });
    previousTime = action.atMs;
  }
  if (actions.length > 0 && parsed.endMs < previousTime) return null;
  return { boardCode: parsed.boardCode, actions, endMs: parsed.endMs };
}
