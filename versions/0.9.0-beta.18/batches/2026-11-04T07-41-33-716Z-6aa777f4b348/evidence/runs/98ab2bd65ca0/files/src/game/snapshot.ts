import { parseBoardCode } from "./board/code.ts";
import { MAX_ELAPSED_MS } from "./clock.ts";
import { createGameFromCode, isWon, type GameState } from "./state.ts";
import {
  decodeMatched,
  decodeSelection,
  hasExactKeys,
  isConsistent,
  isRecord,
  selectionHasDifferentFaces,
  selectionTouchesMatched,
} from "./snapshot-validation.ts";
import { MAX_MOVES } from "./transition.ts";

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_BYTE_LIMIT = 65536;

export function encodeSnapshot(state: GameState): string {
  return JSON.stringify(
    {
      version: SNAPSHOT_VERSION,
      boardCode: state.board.code,
      matched: state.matched,
      selection: state.selection,
      moves: state.moves,
      elapsedMs: state.elapsedMs,
      started: state.started,
    },
    null,
    2,
  );
}

export function decodeSnapshot(text: string): GameState | null {
  if (new TextEncoder().encode(text).byteLength > SNAPSHOT_BYTE_LIMIT) return null;

  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return null;
  }

  if (
    !isRecord(input) ||
    !hasExactKeys(input, [
      "version",
      "boardCode",
      "matched",
      "selection",
      "moves",
      "elapsedMs",
      "started",
    ]) ||
    input.version !== SNAPSHOT_VERSION ||
    typeof input.boardCode !== "string" ||
    !Number.isSafeInteger(input.moves) ||
    typeof input.moves !== "number" ||
    input.moves < 0 ||
    input.moves > MAX_MOVES ||
    !Number.isSafeInteger(input.elapsedMs) ||
    typeof input.elapsedMs !== "number" ||
    input.elapsedMs < 0 ||
    input.elapsedMs > MAX_ELAPSED_MS ||
    typeof input.started !== "boolean"
  ) {
    return null;
  }

  const board = parseBoardCode(input.boardCode);
  if (board === null) return null;

  const initial = createGameFromCode(board);
  const selection = decodeSelection(input.selection, initial.board.deck.length);
  const matched = decodeMatched(input.matched, initial.board.deck);
  if (
    selection === null ||
    matched === null ||
    !selectionHasDifferentFaces(selection, initial.board.deck) ||
    selectionTouchesMatched(selection, matched) ||
    !isConsistent(
      input.started,
      input.moves,
      input.elapsedMs,
      selection,
      matched.length / 2,
      initial.board.deck.length,
    )
  ) {
    return null;
  }

  const restored: GameState = {
    board: initial.board,
    matched,
    selection: Object.freeze(selection),
    moves: input.moves,
    elapsedMs: input.elapsedMs,
    started: input.started,
  };

  return isWon(restored) && selection.kind !== "closed" ? null : Object.freeze(restored);
}
