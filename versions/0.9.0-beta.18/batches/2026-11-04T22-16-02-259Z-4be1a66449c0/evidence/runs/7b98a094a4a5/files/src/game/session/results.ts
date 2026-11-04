import { isWon, matchedPairs, type GameState } from "../state.js";
import { saveBestScores, type BestScores } from "./storage.js";

export function announceTurn(
  previous: GameState,
  next: GameState,
  announce: (text: string) => void,
): void {
  if (next.moves === previous.moves) return;
  if (next.matched.length > previous.matched.length) {
    const pairs = matchedPairs(next);
    if (isWon(next)) {
      announce(`Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`);
    } else if (pairs === 1) {
      announce("Pair found. 1 pair matched.");
    } else {
      announce(`Pair found. ${pairs} pairs matched.`);
    }
    return;
  }
  announce("No match. Cards close after a short pause.");
}

export function recordBest(
  state: GameState,
  current: { current: BestScores },
  setter: (scores: BestScores) => void,
): void {
  const previous = current.current[state.board.size];
  if (previous !== undefined && previous <= state.moves) return;
  const updated = { ...current.current, [state.board.size]: state.moves };
  current.current = updated;
  setter(updated);
  saveBestScores(updated);
}

function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
