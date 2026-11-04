import { useCallback, useRef, useState } from "react";
import { BOARD_SIZES, type BoardSize } from "../board-code.ts";
import { createGame, formatTime, isWon, matchedPairs, type GameState } from "../state.ts";
import { advanceGame, activateCard } from "../transitions.ts";
import { decodeSnapshot, encodeSnapshot } from "../snapshot.ts";
import { readBestScores, readPreferredSize, saveBestScore, savePreferredSize } from "./storage.ts";
import { useActiveClock } from "./useActiveClock.ts";

function randomSeed(): number {
  const values = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(values);
  else values[0] = Math.floor(Math.random() * 0xffff_ffff);
  return (values[0]! % 2_147_483_646) + 1;
}

function freshGame(size: BoardSize, previousCode?: string): GameState {
  let boardCode = `np1-${size}-${randomSeed()}`;
  while (boardCode === previousCode) boardCode = `np1-${size}-${randomSeed()}`;
  const game = createGame(boardCode);
  if (!game) throw new Error("Generated board code was invalid.");
  return game;
}

export type Announcement = Readonly<{ id: number; text: string }>;
export type GameSession = {
  game: GameState;
  best: number | undefined;
  paused: boolean;
  status: string;
  announcement: Announcement;
  celebration: boolean;
  resetToken: number;
  boardCodeDraft: string;
  setBoardCodeDraft: (value: string) => void;
  snapshotDraft: string;
  setSnapshotDraft: (value: string) => void;
  activate: (index: number) => void;
  newGame: () => void;
  restart: () => void;
  changeSize: (size: BoardSize) => void;
  loadBoard: () => void;
  exportSnapshot: () => void;
  loadSnapshot: () => void;
  resume: () => void;
};

export function useGameSession(): GameSession {
  const [game, setGame] = useState(() => freshGame(readPreferredSize() ?? BOARD_SIZES[0]));
  const gameRef = useRef(game);
  const [bestScores, setBestScores] = useState(readBestScores);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [status, setStatus] = useState("");
  const [announcement, setAnnouncement] = useState<Announcement>({ id: 0, text: "" });
  const announcementId = useRef(0);
  const [celebration, setCelebration] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [boardCodeDraft, setBoardCodeDraft] = useState(game.board.boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState("");
  const resetClock = useActiveClock(gameRef, pausedRef, setGame);

  const publish = useCallback((text: string, showStatus = false) => {
    announcementId.current += 1;
    setAnnouncement({ id: announcementId.current, text });
    if (showStatus) setStatus(text);
  }, []);

  const replaceGame = useCallback((next: GameState, codeDraft = next.board.boardCode, pause = false) => {
    gameRef.current = next;
    setGame(next);
    setBoardCodeDraft(codeDraft);
    setCelebration(false);
    pausedRef.current = pause;
    setPaused(pause);
    setResetToken((token) => token + 1);
    resetClock();
  }, [resetClock]);

  const activate = useCallback((index: number) => {
    const current = gameRef.current;
    if (pausedRef.current) return;
    if (!current.started) {
      resetClock();
    }
    const next = activateCard(current, index);
    if (next === current) return;
    gameRef.current = next;
    setGame(next);
    if (current.selection.kind === "one") {
      if (next.selection.kind === "mismatch") publish("No match. Cards close after a short pause.");
      else if (next.matched.length > current.matched.length) {
        if (isWon(next)) {
          publish(`Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`);
          setCelebration(true);
          const score = saveBestScore(next.board.size, next.moves);
          if (score !== null) setBestScores((scores) => ({ ...scores, [next.board.size]: score }));
        } else {
          const pairs = matchedPairs(next);
          publish(`Pair found. ${pairs} ${pairs === 1 ? "pair matched." : "pairs matched."}`);
        }
      }
    }
  }, [publish, resetClock]);

  const newGame = useCallback(() => {
    setStatus("");
    const current = gameRef.current;
    replaceGame(freshGame(current.board.size, current.board.boardCode));
  }, [replaceGame]);

  const restart = useCallback(() => {
    setStatus("");
    const next = createGame(gameRef.current.board.boardCode);
    if (next) replaceGame(next);
  }, [replaceGame]);

  const changeSize = useCallback((size: BoardSize) => {
    savePreferredSize(size);
    setStatus("");
    replaceGame(freshGame(size));
  }, [replaceGame]);

  const loadBoard = useCallback(() => {
    const next = createGame(boardCodeDraft.trim());
    if (!next) {
      publish("Invalid board code.", true);
      return;
    }
    savePreferredSize(next.board.size);
    setStatus("");
    replaceGame(next);
    publish("Loaded board.", true);
  }, [boardCodeDraft, publish, replaceGame]);

  const exportSnapshot = useCallback(() => {
    setSnapshotDraft(encodeSnapshot(gameRef.current));
    setStatus("Snapshot exported.");
  }, []);

  const loadSnapshot = useCallback(() => {
    const next = decodeSnapshot(snapshotDraft);
    if (!next) {
      publish("Invalid snapshot.", true);
      return;
    }
    savePreferredSize(next.board.size);
    const complete = isWon(next);
    const pause = !complete;
    replaceGame(next, next.board.boardCode, pause);
    const message = complete ? "Loaded completed snapshot." : "Loaded snapshot. Select Resume to continue.";
    publish(message, true);
  }, [publish, replaceGame, snapshotDraft]);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    resetClock();
  }, [resetClock]);

  return {
    game,
    best: bestScores[game.board.size],
    paused,
    status,
    announcement,
    celebration,
    resetToken,
    boardCodeDraft,
    setBoardCodeDraft,
    snapshotDraft,
    setSnapshotDraft,
    activate,
    newGame,
    restart,
    changeSize,
    loadBoard,
    exportSnapshot,
    loadSnapshot,
    resume,
  };
}
