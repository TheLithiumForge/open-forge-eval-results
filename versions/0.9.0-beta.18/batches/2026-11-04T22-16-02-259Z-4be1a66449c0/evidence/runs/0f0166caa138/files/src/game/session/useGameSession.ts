import { useRef, useState } from "react";
import { createGame, makeBoardCode, MAX_SEED, parseBoardCode } from "../boardCode.ts";
import { encodeSnapshot, decodeSnapshot } from "../snapshot.ts";
import { activateCard, isWon, matchedPairs } from "../transitions.ts";
import { formatElapsed } from "../clock.ts";
import type { GameState, BoardSize } from "../types.ts";
import { readBestScores, readSavedSize, recordBest, saveSize, type BestScores } from "./storage.ts";
import { useActiveClock } from "./useActiveClock.ts";

function randomSeed(): number {
  try {
    const value = window.crypto.getRandomValues(new Uint32Array(1))[0];
    if (value !== undefined) return (value % MAX_SEED) + 1;
  } catch {
    // Use a local fallback if secure randomness is unavailable.
  }
  return Math.floor(Math.random() * MAX_SEED) + 1;
}

function freshGame(size: BoardSize, avoidCode?: string): GameState {
  let seed = randomSeed();
  if (makeBoardCode(size, seed) === avoidCode) seed = seed === MAX_SEED ? 1 : seed + 1;
  const game = createGame(makeBoardCode(size, seed));
  if (!game) throw new Error("Could not create a new deal.");
  return game;
}

function initialGame(): GameState {
  return freshGame(readSavedSize());
}

export function useGameSession() {
  const [game, setGame] = useState(initialGame);
  const [bestScores, setBestScores] = useState<BestScores>(() => readBestScores());
  const [paused, setPaused] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [status, setStatus] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [announcementId, setAnnouncementId] = useState(0);
  const gameRef = useRef(game);
  const pausedRef = useRef(false);

  function commit(next: GameState): void {
    gameRef.current = next;
    setGame(next);
  }

  const clock = useActiveClock(gameRef, pausedRef, commit);

  function announce(message: string): void {
    setAnnouncement(message);
    setAnnouncementId((value) => value + 1);
  }

  function showStatus(message: string): void {
    setStatus(message);
    announce(message);
  }

  function replaceGame(next: GameState): void {
    commit(next);
    pausedRef.current = false;
    setPaused(false);
    setCelebrate(false);
    clock.reset();
    setResetToken((value) => value + 1);
  }

  function newGame(): void {
    const current = gameRef.current;
    replaceGame(freshGame(current.size, current.boardCode));
  }

  function restart(): void {
    const next = createGame(gameRef.current.boardCode);
    if (next) replaceGame(next);
  }

  function chooseSize(size: BoardSize): void {
    if (size === gameRef.current.size) return;
    saveSize(size);
    replaceGame(freshGame(size));
  }

  function activate(index: number): void {
    const current = clock.sync();
    if (pausedRef.current) return;
    const isSecondReveal = current.selection.kind === "one" &&
      current.selection.index !== index && !current.matched.includes(index);
    const next = activateCard(current, index);
    if (next === current) return;
    commit(next);
    if (!current.started && next.started) clock.start();

    if (isSecondReveal) {
      if (next.matched.length > current.matched.length) {
        const pairs = matchedPairs(next);
        if (isWon(next)) {
          setCelebrate(true);
          setBestScores(recordBest(bestScores, next.size, next.moves));
          announce("Pair found. All pairs found in " + next.moves + " moves and " +
            formatElapsed(next.elapsedMs) + ".");
        } else {
          announce("Pair found. " + pairs + (pairs === 1 ? " pair matched." : " pairs matched."));
        }
      } else {
        announce("No match. Cards close after a short pause.");
      }
    }
    if (isWon(next)) clock.reset();
  }

  function loadBoard(draft: string): void {
    const parsed = parseBoardCode(draft.trim());
    const next = parsed ? createGame(parsed.boardCode) : null;
    if (!next) {
      showStatus("Invalid board code.");
      return;
    }
    saveSize(next.size);
    replaceGame(next);
    showStatus("Loaded board " + next.boardCode + ".");
  }

  function loadSnapshot(draft: string): void {
    const next = decodeSnapshot(draft);
    if (!next) {
      showStatus("Invalid snapshot.");
      return;
    }
    commit(next);
    const waiting = !isWon(next);
    pausedRef.current = waiting;
    setPaused(waiting);
    setCelebrate(false);
    clock.reset();
    setResetToken((value) => value + 1);
    saveSize(next.size);
    showStatus(waiting
      ? "Loaded snapshot. Select Resume to continue."
      : "Loaded completed snapshot.");
  }

  function exportSnapshot(): string {
    const snapshot = clock.capture();
    showStatus("Snapshot exported.");
    return encodeSnapshot(snapshot);
  }

  function resume(): void {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    setPaused(false);
    clock.start();
  }

  return {
    game,
    best: bestScores[game.size],
    paused,
    celebrate,
    resetToken,
    status,
    announcement,
    announcementId,
    newGame,
    restart,
    chooseSize,
    activate,
    loadBoard,
    loadSnapshot,
    exportSnapshot,
    resume,
  };
}
