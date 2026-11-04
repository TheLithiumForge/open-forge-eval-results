import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import { type BoardSize } from "../boardCode.ts";
import { decodeSnapshot, encodeSnapshot } from "../snapshot.ts";
import { activateCard, createGame, isWon, type GameState } from "../state.ts";
import { turnAnnouncement } from "./announcement.ts";
import { freshGame } from "./freshGame.ts";
import { browserStorage, readBestScores, readPreferredSize, saveBestScores, savePreferredSize, type BestScores, type SessionStorage } from "./storage.ts";
import type { SessionAnnouncement } from "./useGameSession.ts";

export interface SessionActions {
  readonly activateCard: (index: number) => void;
  readonly newGame: () => void;
  readonly restart: () => void;
  readonly chooseSize: (size: BoardSize) => void;
  readonly loadBoard: (code: string) => boolean;
  readonly loadSnapshot: (text: string) => boolean;
  readonly exportSnapshot: () => string;
  readonly resume: () => void;
}

interface SessionActionOptions {
  readonly storage: SessionStorage | null;
  readonly stateRef: { current: GameState };
  readonly pausedRef: { current: boolean };
  readonly lastClockRef: { current: number | null };
  readonly fractionRef: { current: number };
  readonly scores: BestScores;
  readonly setScores: Dispatch<SetStateAction<BestScores>>;
  readonly setGame: Dispatch<SetStateAction<GameState>>;
  readonly setPaused: Dispatch<SetStateAction<boolean>>;
  readonly setRevision: Dispatch<SetStateAction<number>>;
  readonly setCelebrationId: Dispatch<SetStateAction<number | null>>;
  readonly setAnnouncement: Dispatch<SetStateAction<SessionAnnouncement | null>>;
  readonly setStatusMessage: Dispatch<SetStateAction<string>>;
  readonly syncClock: (at?: number) => GameState;
}

export function useSessionActions(options: SessionActionOptions): SessionActions {
  const winEligibleRef = useRef(true);
  const announcementIdRef = useRef(0);
  const celebrationIdRef = useRef(0);
  const announce = useCallback((text: string) => {
    announcementIdRef.current += 1;
    options.setAnnouncement({ id: announcementIdRef.current, text });
  }, [options.setAnnouncement]);

  const replaceGame = useCallback((next: GameState, pauseNext = false, imported = false) => {
    options.stateRef.current = next;
    options.pausedRef.current = pauseNext;
    options.lastClockRef.current = performance.now();
    options.fractionRef.current = 0;
    winEligibleRef.current = !imported || !isWon(next);
    options.setGame(next);
    options.setPaused(pauseNext);
    options.setCelebrationId(null);
    options.setStatusMessage("");
    options.setRevision((value) => value + 1);
  }, [options]);

  const activate = useCallback((index: number) => {
    if (options.pausedRef.current) return;
    const now = performance.now();
    const previous = options.syncClock(now);
    const next = activateCard(previous, index);
    if (next === previous) return;
    if (!previous.started && next.started) {
      options.lastClockRef.current = now;
      options.fractionRef.current = 0;
    }
    options.stateRef.current = next;
    options.setGame(next);
    const result = turnAnnouncement(previous, next);
    if (result !== null) announce(result);
    if (!isWon(next) || isWon(previous)) return;
    if (winEligibleRef.current) recordBest(next, options.scores, options.storage, options.setScores);
    if (winEligibleRef.current) {
      celebrationIdRef.current += 1;
      options.setCelebrationId(celebrationIdRef.current);
    }
  }, [announce, options]);

  const newGame = useCallback(() => {
    const current = options.stateRef.current;
    replaceGame(freshGame(current.size, current.boardCode));
  }, [options.stateRef, replaceGame]);

  const restart = useCallback(() => {
    const next = createGame(options.stateRef.current.boardCode);
    if (next !== null) replaceGame(next);
  }, [options.stateRef, replaceGame]);

  const chooseSize = useCallback((size: BoardSize) => {
    const current = options.stateRef.current;
    if (current.size === size) return;
    savePreferredSize(options.storage, size);
    replaceGame(freshGame(size, current.boardCode));
  }, [options.stateRef, options.storage, replaceGame]);

  const loadBoard = useCallback((draft: string): boolean => {
    const next = createGame(draft.trim());
    if (next === null) {
      options.setStatusMessage("Invalid board code.");
      announce("Invalid board code.");
      return false;
    }
    savePreferredSize(options.storage, next.size);
    replaceGame(next);
    options.setStatusMessage("Loaded board.");
    announce("Loaded board.");
    return true;
  }, [announce, options.storage, options.setStatusMessage, replaceGame]);

  const loadSnapshot = useCallback((text: string): boolean => {
    const next = decodeSnapshot(text);
    if (next === null) {
      options.setStatusMessage("Invalid snapshot.");
      announce("Invalid snapshot.");
      return false;
    }
    const completed = isWon(next);
    replaceGame(next, !completed, true);
    savePreferredSize(options.storage, next.size);
    const message = completed ? "Loaded completed snapshot." : "Loaded snapshot. Select Resume to continue.";
    options.setStatusMessage(message);
    announce(message);
    return true;
  }, [announce, options.storage, options.setStatusMessage, replaceGame]);

  const resume = useCallback(() => {
    if (!options.pausedRef.current) return;
    options.pausedRef.current = false;
    options.lastClockRef.current = performance.now();
    options.fractionRef.current = 0;
    options.setPaused(false);
  }, [options]);

  const exportSnapshot = useCallback(() => encodeSnapshot(options.syncClock()), [options.syncClock]);

  return { activateCard: activate, newGame, restart, chooseSize, loadBoard, loadSnapshot, exportSnapshot, resume };
}

function recordBest(game: GameState, scores: BestScores, storage: SessionStorage | null, save: Dispatch<SetStateAction<BestScores>>): void {
  const previous = scores[game.size];
  if (previous !== undefined && previous <= game.moves) return;
  const next = { ...scores, [game.size]: game.moves };
  saveBestScores(storage, next);
  save(next);
}
