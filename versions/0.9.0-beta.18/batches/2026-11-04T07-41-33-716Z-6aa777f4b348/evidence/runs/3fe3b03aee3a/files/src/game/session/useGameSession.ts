import { useEffect, useRef, useState } from "react";
import { createGame, parseBoardCode } from "../board.ts";
import { activateCard, advanceGame, isWon } from "../state.ts";
import { decodeSnapshot, encodeSnapshot } from "../snapshot.ts";
import type { BoardSize, GameState } from "../types.ts";
import type { GameSession, SessionAnnouncement } from "./contracts.ts";
import { isBoardSize, readPreferences, writePreferences, type Preferences } from "./storage.ts";
import { useActiveClock } from "./useActiveClock.ts";
import { formatElapsed, freshBoardCode } from "./deal.ts";

const celebrationPulseMs = 600;

function initialSession(): Readonly<{ preferences: Preferences; game: GameState }> {
  const preferences = readPreferences();
  return { preferences, game: createGame(freshBoardCode(preferences.size)) };
}

export function useGameSession(): GameSession {
  const [initial] = useState(initialSession);
  const [game, setGame] = useState(initial.game);
  const [preferences, setPreferences] = useState(initial.preferences);
  const [isPaused, setIsPaused] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [boardRevision, setBoardRevision] = useState(0);
  const [announcement, setAnnouncement] = useState<SessionAnnouncement>({ id: 0, text: "" });
  const [loadStatus, setLoadStatus] = useState("");
  const gameRef = useRef(game);
  const preferencesRef = useRef(preferences);
  const pausedRef = useRef(false);
  const generation = useRef(0);
  const announcementId = useRef(0);
  const revisionRef = useRef(0);
  const celebrationTimer = useRef<number | null>(null);
  const won = isWon(game);
  const clock = useActiveClock(game.started, won, isPaused, boardRevision, (elapsed) => {
    commitGame(advanceGame(gameRef.current, elapsed));
  });

  function commitGame(next: GameState): void {
    gameRef.current = next;
    setGame(next);
  }

  function announce(text: string): void {
    announcementId.current += 1;
    setAnnouncement({ id: announcementId.current, text });
  }

  function savePreferences(next: Preferences): void {
    preferencesRef.current = next;
    setPreferences(next);
    writePreferences(next);
  }

  function rememberSize(size: BoardSize): void {
    savePreferences({ ...preferencesRef.current, size });
  }

  function clearCelebration(): void {
    if (celebrationTimer.current !== null) window.clearTimeout(celebrationTimer.current);
    celebrationTimer.current = null;
    setIsCelebrating(false);
  }

  function replaceGame(next: GameState, paused: boolean, status: string, message: string): void {
    generation.current += 1;
    revisionRef.current += 1;
    clock.stop();
    pausedRef.current = paused;
    clearCelebration();
    commitGame(next);
    setIsPaused(paused);
    setBoardRevision(revisionRef.current);
    setLoadStatus(status);
    if (message !== "") announce(message);
  }

  useEffect(() => () => {
    generation.current += 1;
    clock.stop();
    if (celebrationTimer.current !== null) window.clearTimeout(celebrationTimer.current);
  }, []);

  function activate(index: number): void {
    if (pausedRef.current || !clock.visibleRef.current) return;
    const now = performance.now();
    clock.syncAt(now);
    const before = gameRef.current;
    const next = activateCard(before, index);
    if (next === before) return;
    commitGame(next);
    if (!before.started) clock.startAt(now);
    if (before.selection.kind !== "one") return;

    const completed = isWon(next);
    if (next.matched.length > before.matched.length) {
      if (completed) announce(`Pair found. All pairs found in ${next.moves} moves and ${formatElapsed(next.elapsedMs)}.`);
      else {
        const pairs = next.matched.length / 2;
        announce(`Pair found. ${pairs} pair${pairs === 1 ? "" : "s"} matched.`);
      }
    } else if (next.selection.kind === "mismatch") {
      announce("No match. Cards close after a short pause.");
    }
    if (!completed) return;

    clock.stop();
    const best = preferencesRef.current.bestScores[next.board.size];
    if (best === undefined || next.moves < best) {
      savePreferences({
        ...preferencesRef.current,
        bestScores: { ...preferencesRef.current.bestScores, [next.board.size]: next.moves }
      });
    }
    const token = generation.current;
    setIsCelebrating(true);
    celebrationTimer.current = window.setTimeout(() => {
      if (generation.current === token) setIsCelebrating(false);
      celebrationTimer.current = null;
    }, celebrationPulseMs);
  }

  function changeSize(size: BoardSize): void {
    if (!isBoardSize(size) || size === gameRef.current.board.size) return;
    const next = createGame(freshBoardCode(size, gameRef.current.board.code));
    rememberSize(size);
    replaceGame(next, false, "", "");
  }

  function newGame(): void {
    const current = gameRef.current;
    replaceGame(createGame(freshBoardCode(current.board.size, current.board.code)), false, "", "");
  }

  function restart(): void {
    replaceGame(createGame(gameRef.current.board.code), false, "", "");
  }

  function loadBoard(text: string): boolean {
    const parsed = parseBoardCode(text.trim());
    if (parsed === null) {
      setLoadStatus("Invalid board code.");
      announce("Invalid board code.");
      return false;
    }
    const next = createGame(parsed.code);
    rememberSize(next.board.size);
    replaceGame(next, false, "", "");
    return true;
  }

  function loadSnapshot(text: string): boolean {
    const next = decodeSnapshot(text);
    if (next === null) {
      setLoadStatus("Invalid snapshot.");
      announce("Invalid snapshot.");
      return false;
    }
    const completed = isWon(next);
    rememberSize(next.board.size);
    replaceGame(next, !completed, completed ? "Loaded completed snapshot." : "Loaded snapshot. Select Resume to continue.",
      completed ? "Loaded completed snapshot." : "Loaded snapshot. Select Resume to continue.");
    return true;
  }

  function exportSnapshot(): string {
    clock.syncAt(performance.now());
    return encodeSnapshot(gameRef.current);
  }

  function resume(): void {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    setIsPaused(false);
    if (gameRef.current.started && !isWon(gameRef.current)) clock.startAt(performance.now());
  }

  return {
    game,
    bestScore: preferences.bestScores[game.board.size] ?? null,
    isPaused,
    isCelebrating,
    boardRevision,
    announcement,
    loadStatus,
    activate,
    changeSize,
    newGame,
    restart,
    loadBoard,
    loadSnapshot,
    exportSnapshot,
    resume
  };
}
