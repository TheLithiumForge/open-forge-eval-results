import { createGame } from "./boardCode.ts";
import { activateCard, advanceGame } from "./transitions.ts";
import type { GameState } from "./types.ts";

const MAX_REPLAY_BYTES = 1_048_576;
const MAX_ACTIONS = 10_000;

type ReplayAction = { readonly atMs: number; readonly index: number };
type ReplayRecord = {
  readonly version: 1;
  readonly boardCode: string;
  readonly actions: readonly ReplayAction[];
  readonly endMs: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function isTime(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseReplay(text: string): ReplayRecord | null {
  if (new TextEncoder().encode(text).byteLength > MAX_REPLAY_BYTES) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(raw) || !exactKeys(raw, ["version", "boardCode", "actions", "endMs"])) return null;
  if (raw.version !== 1 || typeof raw.boardCode !== "string" || !isTime(raw.endMs)) return null;
  const initial = createGame(raw.boardCode);
  if (!initial || !Array.isArray(raw.actions) || raw.actions.length > MAX_ACTIONS) return null;

  const actions: ReplayAction[] = [];
  let previousTime = 0;
  for (const entry of raw.actions) {
    if (!isRecord(entry) || !exactKeys(entry, ["atMs", "index"])) return null;
    if (!isTime(entry.atMs) || !isTime(entry.index) || entry.index >= initial.deck.length) return null;
    if (actions.length > 0 && entry.atMs < previousTime) return null;
    actions.push({ atMs: entry.atMs, index: entry.index });
    previousTime = entry.atMs;
  }
  if (actions.length > 0 && raw.endMs < previousTime) return null;
  return { version: 1, boardCode: raw.boardCode, actions, endMs: raw.endMs };
}

export function replayGame(text: string): GameState | null {
  const replay = parseReplay(text);
  if (!replay) return null;
  let state = createGame(replay.boardCode);
  if (!state) return null;
  let cursor = 0;
  for (const action of replay.actions) {
    state = advanceGame(state, action.atMs - cursor);
    state = activateCard(state, action.index);
    cursor = action.atMs;
  }
  state = advanceGame(state, replay.endMs - cursor);
  return state;
}
