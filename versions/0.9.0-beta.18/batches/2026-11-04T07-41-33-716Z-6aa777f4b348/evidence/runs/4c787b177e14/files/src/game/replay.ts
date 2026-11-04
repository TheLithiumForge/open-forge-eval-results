import { FORMAT_VERSION, REPLAY_LIMIT_ACTIONS, REPLAY_LIMIT_BYTES } from "./constants.ts";
import { createGame } from "./board.ts";
import { activateCard, advanceGame } from "./transitions.ts";
import type { GameState } from "./types.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const hasKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const isTime = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
function isUnknownArray(value: unknown): value is unknown[] { return Array.isArray(value); }

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > REPLAY_LIMIT_BYTES) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!isRecord(value) || !hasKeys(value, ["version", "boardCode", "actions", "endMs"])) return null;
  if (value.version !== FORMAT_VERSION || typeof value.boardCode !== "string" || !isTime(value.endMs) || !isUnknownArray(value.actions)) return null;
  if (value.actions.length > REPLAY_LIMIT_ACTIONS) return null;
  const initial = createGame(value.boardCode);
  if (!initial) return null;
  let state = initial;
  let previousTime = 0;
  for (const item of value.actions) {
    if (!isRecord(item) || !hasKeys(item, ["atMs", "index"]) || !isTime(item.atMs)) return null;
    const atMs = item.atMs;
    const index = item.index;
    if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0 || index >= state.board.deck.length) return null;
    if (atMs < previousTime || atMs > value.endMs) return null;
    state = advanceGame(state, atMs - previousTime);
    state = activateCard(state, index);
    previousTime = atMs;
  }
  return advanceGame(state, value.endMs - previousTime);
}
