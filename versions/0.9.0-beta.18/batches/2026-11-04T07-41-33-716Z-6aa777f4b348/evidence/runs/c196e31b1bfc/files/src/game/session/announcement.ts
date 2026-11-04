import { isWon, type GameState } from "../state.ts";
import { formatElapsedTime } from "./clock.ts";

export function turnAnnouncement(previous: GameState, next: GameState): string | null {
  if (next.matched.length > previous.matched.length) {
    if (isWon(next)) {
      return `Pair found. All pairs found in ${next.moves} moves and ${formatElapsedTime(next.elapsedMs)}.`;
    }
    const pairs = next.matched.length / 2;
    return `Pair found. ${pairs} ${pairs === 1 ? "pair" : "pairs"} matched.`;
  }
  if (previous.selection.kind !== "mismatch" && next.selection.kind === "mismatch") {
    return "No match. Cards close after a short pause.";
  }
  return null;
}
