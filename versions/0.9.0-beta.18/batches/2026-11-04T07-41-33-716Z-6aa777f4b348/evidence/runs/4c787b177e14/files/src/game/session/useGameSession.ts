import { useRef, useState } from "react";
import { createGame, parseBoardCode } from "../board.ts";
import { encodeSnapshot, decodeSnapshot } from "../snapshot.ts";
import { activateCard, isWon } from "../transitions.ts";
import type { GameState, GridSize } from "../types.ts";
import { formatElapsedTime, makeFreshBoardCode } from "./clock.ts";
import type { GameSession, Notice } from "./contracts.ts";
import { readPreferences, saveBestScores, saveGridSize } from "./storage.ts";
import type { BestScores } from "./storage.ts";
import { useActiveClock } from "./useActiveClock.ts";
import { useSessionClock } from "./useSessionClock.ts";
function initialDeal(size: GridSize): GameState {
  const state = createGame(makeFreshBoardCode(size));
  if (state === null) throw new Error("Unable to create the initial deal.");
  return state;
}

export function useGameSession(): GameSession {
  const [preferences] = useState(readPreferences);
  const [game, setGame] = useState(() => initialDeal(preferences.gridSize));
  const [paused, setPaused] = useState(false);
  const [bestScores, setBestScores] = useState<BestScores>(preferences.bestScores);
  const [dealRevision, setDealRevision] = useState(0);
  const [celebration, setCelebration] = useState(false);
  const [notice, setNotice] = useState<Notice>({ text: "", revision: 0 });
  const gameRef = useRef(game);
  const pausedRef = useRef(false);
  const bestScoresRef = useRef(bestScores);
  const visibleRef = useRef(true);
  const dealRevisionRef = useRef(0);

  function updateGame(next: GameState): void {
    gameRef.current = next;
    setGame(next);
  }

  const clock = useActiveClock(gameRef, pausedRef, visibleRef, updateGame);
  const clockRef = useRef(clock);
  clockRef.current = clock;

  function announce(text: string): void {
    setNotice((current) => ({ text, revision: current.revision + 1 }));
  }

  function tickAt(now: number): GameState {
    return clock.tickAt(now);
  }

  useSessionClock(gameRef, pausedRef, visibleRef, dealRevisionRef, dealRevision, paused, game.started, game.selection.kind, clockRef);

  function replaceDeal(next: GameState, nextPaused: boolean): void {
    updateGame(next);
    pausedRef.current = nextPaused;
    setPaused(nextPaused);
    clock.reset();
    setCelebration(false);
    dealRevisionRef.current += 1;
    setDealRevision(dealRevisionRef.current);
    saveGridSize(next.board.size);
  }

  function startCode(code: string): void {
    const next = createGame(code);
    if (next !== null) replaceDeal(next, false);
  }

  function newGame(): void {
    const current = gameRef.current;
    startCode(makeFreshBoardCode(current.board.size, current.board.seed));
  }

  function restart(): void {
    const current = gameRef.current;
    startCode(current.board.code);
  }

  function changeSize(size: GridSize): void {
    if (gameRef.current.board.size === size) return;
    const current = gameRef.current;
    startCode(makeFreshBoardCode(size, current.board.seed));
  }

  function publishStatus(text: string): void {
    announce(text);
  }

  function loadBoard(draft: string): boolean {
    const parsed = parseBoardCode(draft.trim());
    if (parsed === null) {
      publishStatus("Invalid board code.");
      return false;
    }
    startCode(parsed.code);
    publishStatus("Board loaded.");
    return true;
  }

  function loadSnapshot(draft: string): boolean {
    const restored = decodeSnapshot(draft);
    if (restored === null) {
      publishStatus("Invalid snapshot.");
      return false;
    }
    const completed = isWon(restored);
    replaceDeal(restored, !completed);
    publishStatus(completed ? "Loaded completed snapshot." : "Loaded snapshot. Select Resume to continue.");
    return true;
  }

  function exportSnapshot(): string {
    tickAt(performance.now());
    publishStatus("Snapshot exported.");
    return JSON.stringify(JSON.parse(encodeSnapshot(gameRef.current)), null, 2);
  }

  function resume(): void {
    if (!pausedRef.current || isWon(gameRef.current)) return;
    pausedRef.current = false;
    setPaused(false);
    clock.resumeAt(performance.now());
    publishStatus("Game resumed.");
  }

  function saveBestIfBeaten(won: GameState): void {
    const size = won.board.size;
    const previous = bestScoresRef.current[size];
    if (previous !== undefined && won.moves >= previous) return;
    const next = { ...bestScoresRef.current, [size]: won.moves };
    bestScoresRef.current = next;
    setBestScores(next);
    saveBestScores(next);
  }

  function activate(index: number): void {
    if (pausedRef.current || !visibleRef.current) return;
    const now = performance.now();
    const beforeTick = gameRef.current;
    if (beforeTick.started) tickAt(now);
    const before = gameRef.current;
    const next = activateCard(before, index);
    if (next === before) return;
    if (!before.started && next.started) {
      clock.begin(now);
    }
    updateGame(next);
    if (before.selection.kind === "one" && next.selection.kind === "mismatch") {
      announce("No match. Cards close after a short pause.");
    } else if (before.selection.kind === "one" && next.selection.kind === "closed") {
      if (isWon(next)) {
        setCelebration(true);
        saveBestIfBeaten(next);
        announce(`Pair found. All pairs found in ${next.moves} moves and ${formatElapsedTime(next.elapsedMs)}.`);
        clock.suspend();
      } else {
        const pairs = next.matched.length / 2;
        announce(`Pair found. ${pairs} ${pairs === 1 ? "pair" : "pairs"} matched.`);
      }
    }
  }

  return {
    game, paused, dealRevision, celebration, bestScores, notice,
    activate, newGame, restart, changeSize, loadBoard, loadSnapshot, exportSnapshot, resume,
  };
}
