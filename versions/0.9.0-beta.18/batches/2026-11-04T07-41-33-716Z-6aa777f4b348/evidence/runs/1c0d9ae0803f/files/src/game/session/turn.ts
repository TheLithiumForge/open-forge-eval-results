import { formatTime } from "../timing.ts";
import { isWon, matchedPairs, type GameState } from "../state.ts";

export function turnAnnouncement(before: GameState, after: GameState): string | null {
  if (before.selection.kind !== "one" || before === after) return null;
  if (matchedPairs(after) > matchedPairs(before)) {
    if (isWon(after)) {
      return `Pair found. All pairs found in ${after.moves} moves and ${formatTime(after.elapsedMs)}.`;
    }
    const pairs = matchedPairs(after);
    const label = pairs === 1 ? "pair" : "pairs";
    return `Pair found. ${pairs} ${label} matched.`;
  }
  return "No match. Cards close after a short pause.";
}
