import { REPLAY_VERSION } from "./constants.ts";
import { createGame, activateCard, advanceGame, type GameState } from "./game.ts";

const REPLAY_LIMIT_BYTES = 1_048_576;
const MAX_ACTIONS = 10_000;

interface ReplayAction { readonly atMs: number; readonly index: number; }
interface ReplayDocument { readonly boardCode: string; readonly actions: readonly ReplayAction[]; readonly endMs: number; }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function safeTime(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseReplay(text: string): ReplayDocument | null {
  if (new TextEncoder().encode(text).length > REPLAY_LIMIT_BYTES) return null;
  let input: unknown;
  try { input = JSON.parse(text) as unknown; } catch { return null; }
  if (!isRecord(input) || !hasExactKeys(input, ["version", "boardCode", "actions", "endMs"])) return null;
  if (input.version !== REPLAY_VERSION || typeof input.boardCode !== "string" || !isUnknownArray(input.actions)) return null;
  const game = createGame(input.boardCode);
  if (game === null || game.board.code !== input.boardCode || !safeTime(input.endMs) || input.actions.length > MAX_ACTIONS) return null;
  const actions: ReplayAction[] = [];
  let lastTime = 0;
  for (const item of input.actions) {
    if (!isRecord(item) || !hasExactKeys(item, ["atMs", "index"])) return null;
    if (!safeTime(item.atMs) || typeof item.index !== "number" || !Number.isSafeInteger(item.index) || item.index < 0 || item.index >= game.deck.length) return null;
    if (actions.length > 0 && item.atMs < lastTime) return null;
    lastTime = item.atMs;
    actions.push({ atMs: item.atMs, index: item.index });
  }
  if (actions.length > 0 && input.endMs < lastTime) return null;
  return { boardCode: input.boardCode, actions, endMs: input.endMs };
}

export function replayGame(text: string): GameState | null {
  const replay = parseReplay(text);
  if (replay === null) return null;
  let state = createGame(replay.boardCode);
  if (state === null) return null;
  let currentTime = 0;
  for (const action of replay.actions) {
    state = advanceGame(state, action.atMs - currentTime);
    state = activateCard(state, action.index);
    currentTime = action.atMs;
  }
  return advanceGame(state, replay.endMs - currentTime);
}
