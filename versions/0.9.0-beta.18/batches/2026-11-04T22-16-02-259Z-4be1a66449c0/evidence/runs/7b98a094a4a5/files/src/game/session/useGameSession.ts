import { useCallback, useRef, useState } from "react";
import type { BoardSize } from "../constants.js";
import { formatBoardCode, isBoardSize } from "../boardCode.js";
import { createGame, isWon, type GameState } from "../state.js";
import { decodeSnapshot, encodeSnapshot } from "../snapshot.js";
import { activateCard, advanceGame } from "../turns.js";
import { createSeed } from "./randomSeed.js";
import { announceTurn, recordBest } from "./results.js";
import { readBestScores, readSavedSize, saveSize } from "./storage.js";
import { useGameClock, type ClockCursor } from "./useGameClock.js";

export interface Announcement {
  readonly id: number;
  readonly text: string;
}

export interface GameSession {
  readonly game: GameState;
  readonly paused: boolean;
  readonly bestMoves: number | null;
  readonly dealRevision: number;
  readonly announcement: Announcement;
  readonly reproductionStatus: string;
  readonly celebrating: boolean;
  readonly selectSize: (size: number) => void;
  readonly newGame: () => void;
  readonly restart: () => void;
  readonly activate: (index: number) => void;
  readonly loadBoard: (code: string) => void;
  readonly loadSnapshot: (text: string) => void;
  readonly exportSnapshot: () => string;
  readonly resume: () => void;
  readonly clearCelebration: () => void;
}

export function useGameSession(): GameSession {
  const [game, setGame] = useState(createInitialGame);
  const gameRef = useRef(game);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [bestScores, setBestScores] = useState(readBestScores);
  const bestScoresRef = useRef(bestScores);
  const [generation, setGeneration] = useState(0);
  const generationRef = useRef(0);
  const [dealRevision, setDealRevision] = useState(0);
  const [announcement, setAnnouncement] = useState<Announcement>({ id: 0, text: "" });
  const [reproductionStatus, setReproductionStatus] = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const clockCursor = useRef<ClockCursor>({ lastTimeMs: performance.now(), fractionalMs: 0 });
  const clockFlush = useRef<() => void>(() => undefined);

  const read = useCallback(() => gameRef.current, []);
  const advance = useCallback((milliseconds: number) => {
    const next = advanceGame(gameRef.current, milliseconds);
    gameRef.current = next;
    setGame(next);
  }, []);
  useGameClock({
    started: game.started,
    paused,
    won: isWon(game),
    generation,
    generationRef,
    cursor: clockCursor,
    flush: clockFlush,
    read,
    advance,
  });

  const announce = (text: string): void => {
    setAnnouncement((current) => ({ id: current.id + 1, text }));
  };

  const replaceGame = (next: GameState, isPaused: boolean, status: string): void => {
    generationRef.current += 1;
    setGeneration(generationRef.current);
    clockCursor.current = { lastTimeMs: performance.now(), fractionalMs: 0 };
    pausedRef.current = isPaused;
    setPaused(isPaused);
    gameRef.current = next;
    setGame(next);
    saveSize(next.board.size);
    setDealRevision((value) => value + 1);
    setCelebrating(false);
    setReproductionStatus(status);
    announce(status);
  };

  const freshGame = (size: BoardSize): void => {
    const next = createGame(formatBoardCode(size, createSeed()));
    if (next !== null) replaceGame(next, false, "");
  };

  const selectSize = (size: number): void => {
    if (!isBoardSize(size)) return;
    freshGame(size);
  };

  const newGame = (): void => freshGame(gameRef.current.board.size);
  const restart = (): void => {
    const next = createGame(gameRef.current.board.boardCode);
    if (next !== null) replaceGame(next, false, "");
  };

  const activate = (index: number): void => {
    if (pausedRef.current) return;
    clockFlush.current();
    const previous = gameRef.current;
    const next = activateCard(previous, index);
    if (next === previous) return;
    if (!previous.started && next.started) {
      clockCursor.current = { lastTimeMs: performance.now(), fractionalMs: 0 };
    }
    gameRef.current = next;
    setGame(next);
    announceTurn(previous, next, announce);
    if (!isWon(previous) && isWon(next)) recordBest(next, bestScoresRef, setBestScores);
    if (!isWon(previous) && isWon(next)) setCelebrating(true);
  };

  const loadBoard = (code: string): void => {
    const next = createGame(code.trim());
    if (next === null) {
      setReproductionStatus("Invalid board code.");
      announce("Invalid board code.");
      return;
    }
    replaceGame(next, false, "Loaded board.");
  };

  const loadSnapshot = (text: string): void => {
    const next = decodeSnapshot(text);
    if (next === null) {
      setReproductionStatus("Invalid snapshot.");
      announce("Invalid snapshot.");
      return;
    }
    const isPaused = !isWon(next);
    const status = isPaused
      ? "Loaded snapshot. Select Resume to continue."
      : "Loaded completed snapshot.";
    replaceGame(next, isPaused, status);
  };

  const exportSnapshot = (): string => {
    clockFlush.current();
    return encodeSnapshot(gameRef.current);
  };

  const resume = (): void => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    clockCursor.current = { lastTimeMs: performance.now(), fractionalMs: 0 };
    setPaused(false);
  };

  const clearCelebration = (): void => setCelebrating(false);
  const bestMoves = bestScores[game.board.size] ?? null;

  return {
    game,
    paused,
    bestMoves,
    dealRevision,
    announcement,
    reproductionStatus,
    celebrating,
    selectSize,
    newGame,
    restart,
    activate,
    loadBoard,
    loadSnapshot,
    exportSnapshot,
    resume,
    clearCelebration,
  };
}

function createInitialGame(): GameState {
  const size = readSavedSize() ?? 4;
  const game = createGame(formatBoardCode(size, createSeed()));
  if (game === null) throw new Error("Could not create a starting deal.");
  return game;
}

