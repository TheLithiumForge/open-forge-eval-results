import { createGame, parseBoardCode } from "./board.ts";
import { advanceGame, activateCard } from "./state.ts";
import { GAME_LIMITS, type GameState } from "./types.ts";

type ReplayAction = Readonly<{ atMs: number; index: number }>;
export const REPLAY_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function nonnegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function readActions(value: unknown, deckLength: number): readonly ReplayAction[] | null {
  if (!Array.isArray(value) || value.length > GAME_LIMITS.replayActions) return null;
  const actions: ReplayAction[] = [];
  let lastTime = 0;
  for (const item of value) {
    if (!isRecord(item) || !exactKeys(item, ["atMs", "index"])) return null;
    const atMs = item.atMs;
    const index = item.index;
    if (!nonnegativeSafeInteger(atMs) || !nonnegativeSafeInteger(index) || index >= deckLength) return null;
    if (actions.length > 0 && atMs < lastTime) return null;
    actions.push({ atMs, index });
    lastTime = atMs;
  }
  return actions;
}

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > GAME_LIMITS.replayBytes) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return null; }
  if (!isRecord(parsed) || !exactKeys(parsed, ["version", "boardCode", "actions", "endMs"])) return null;
  if (parsed.version !== REPLAY_VERSION || typeof parsed.boardCode !== "string" || !nonnegativeSafeInteger(parsed.endMs)) return null;
  const parsedBoard = parseBoardCode(parsed.boardCode);
  if (parsedBoard === null) return null;
  const state = createGame(parsed.boardCode);
  const actions = readActions(parsed.actions, state.board.deck.length);
  if (actions === null) return null;
  const finalAction = actions.at(-1);
  if (finalAction !== undefined && parsed.endMs < finalAction.atMs) return null;

  let result = state;
  let now = 0;
  for (const action of actions) {
    result = advanceGame(result, action.atMs - now);
    result = activateCard(result, action.index);
    now = action.atMs;
  }
  return advanceGame(result, parsed.endMs - now);
}
