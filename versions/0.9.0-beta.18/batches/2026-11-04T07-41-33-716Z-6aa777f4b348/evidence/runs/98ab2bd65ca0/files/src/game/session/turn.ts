import { formatElapsedTime } from "../clock.ts";
import { isWon, pairCount, type GameState } from "../state.ts";

export interface TurnResult {
  readonly message: string;
  readonly won: boolean;
}

export function describeTurn(before: GameState, after: GameState): TurnResult | null {
  if (after.matched.length > before.matched.length) {
    if (isWon(after)) {
      return {
        message: `Pair found. All pairs found in ${after.moves} moves and ${formatElapsedTime(after.elapsedMs)}.`,
        won: true,
      };
    }
    const pairs = pairCount(after);
    const noun = pairs === 1 ? "pair" : "pairs";
    return { message: `Pair found. ${pairs} ${noun} matched.`, won: false };
  }
  return after.selection.kind === "mismatch"
    ? { message: "No match. Cards close after a short pause.", won: false }
    : null;
}
