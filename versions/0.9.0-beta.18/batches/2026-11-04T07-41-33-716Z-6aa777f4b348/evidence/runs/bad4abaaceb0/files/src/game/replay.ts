import { ACTION_KEYS, MAX_REPLAY_ACTIONS, MAX_REPLAY_BYTES, REPLAY_KEYS, REPLAY_VERSION } from "./constants.ts";
import { createGame } from "./transition.ts";
import { activateCard, advanceGame } from "./transition.ts";
import type { GameState } from "./state.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}

function nonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

type ReplayAction = Readonly<{ atMs: number; index: number }>;

function parseActions(value: unknown, state: GameState): readonly ReplayAction[] | null {
  if (!Array.isArray(value) || value.length > MAX_REPLAY_ACTIONS) return null;
  const actions: ReplayAction[] = [];
  let previous = 0;
  for (const item of value) {
    if (!isRecord(item) || !hasKeys(item, ACTION_KEYS)) return null;
    if (!nonnegativeInteger(item.atMs) || item.atMs < previous) return null;
    if (!nonnegativeInteger(item.index) || item.index >= state.deck.length) return null;
    actions.push({ atMs: item.atMs, index: item.index });
    previous = item.atMs;
  }
  return actions;
}

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > MAX_REPLAY_BYTES) return null;
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (!isRecord(value) || !hasKeys(value, REPLAY_KEYS) || value.version !== REPLAY_VERSION) return null;
  if (typeof value.boardCode !== "string" || !nonnegativeInteger(value.endMs)) return null;
  const initial = createGame(value.boardCode);
  if (!initial) return null;
  const actions = parseActions(value.actions, initial);
  if (!actions) return null;
  const lastAtMs = actions.at(-1)?.atMs ?? 0;
  if (value.endMs < lastAtMs) return null;

  let state = initial;
  let time = 0;
  for (const action of actions) {
    state = advanceGame(state, action.atMs - time);
    state = activateCard(state, action.index);
    time = action.atMs;
  }
  return advanceGame(state, value.endMs - time);
}
