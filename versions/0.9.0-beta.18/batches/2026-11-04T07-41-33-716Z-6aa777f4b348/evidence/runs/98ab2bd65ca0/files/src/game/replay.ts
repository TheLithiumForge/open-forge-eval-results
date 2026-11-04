import { parseBoardCode } from "./board/code.ts";
import { advanceGame } from "./clock.ts";
import { createGameFromCode, type GameState } from "./state.ts";
import { activateCard } from "./transition.ts";

export const REPLAY_VERSION = 1;
export const REPLAY_BYTE_LIMIT = 1048576;
export const REPLAY_ACTION_LIMIT = 10000;

interface ReplayAction {
  readonly atMs: number;
  readonly index: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isTime(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function decodeAction(value: unknown, cardCount: number): ReplayAction | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["atMs", "index"]) ||
    !isTime(value.atMs) ||
    typeof value.index !== "number" ||
    !Number.isSafeInteger(value.index) ||
    value.index < 0 ||
    value.index >= cardCount
  ) {
    return null;
  }

  return { atMs: value.atMs, index: value.index };
}

function decodeActions(value: unknown, cardCount: number): readonly ReplayAction[] | null {
  if (!isUnknownArray(value) || value.length > REPLAY_ACTION_LIMIT) return null;
  const actions: ReplayAction[] = [];
  let previousAtMs = 0;

  for (const rawAction of value) {
    const action = decodeAction(rawAction, cardCount);
    if (action === null || action.atMs < previousAtMs) return null;
    previousAtMs = action.atMs;
    actions.push(action);
  }

  return actions;
}

function replayActions(
  initial: GameState,
  actions: readonly ReplayAction[],
  endMs: number,
): GameState {
  let state = initial;
  let previousAtMs = 0;

  for (const action of actions) {
    state = advanceGame(state, action.atMs - previousAtMs);
    state = activateCard(state, action.index);
    previousAtMs = action.atMs;
  }

  return advanceGame(state, endMs - previousAtMs);
}

export function replayGame(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > REPLAY_BYTE_LIMIT) return null;

  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return null;
  }

  if (
    !isRecord(input) ||
    !hasExactKeys(input, ["version", "boardCode", "actions", "endMs"]) ||
    input.version !== REPLAY_VERSION ||
    typeof input.boardCode !== "string" ||
    !isTime(input.endMs)
  ) {
    return null;
  }

  const board = parseBoardCode(input.boardCode);
  if (board === null) return null;
  const initial = createGameFromCode(board);
  const actions = decodeActions(input.actions, initial.board.deck.length);
  if (actions === null) return null;
  const lastAction = actions.at(-1);
  if (lastAction !== undefined && input.endMs < lastAction.atMs) return null;

  return replayActions(initial, actions, input.endMs);
}
