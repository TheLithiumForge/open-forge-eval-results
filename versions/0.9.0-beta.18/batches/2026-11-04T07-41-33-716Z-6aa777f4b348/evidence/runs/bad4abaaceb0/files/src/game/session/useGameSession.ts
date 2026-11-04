import { useEffect, useRef, useState } from "react";
import { GRID_SIZES, SELECTION_KIND, type GridSize } from "../constants.ts";
import { isGridSize } from "../boardCode.ts";
import { createGame, activateCard, advanceGame, formatTime, isWon } from "../transition.ts";
import { decodeSnapshot, encodeSnapshot } from "../snapshot.ts";
import type { GameState } from "../state.ts";
import { readPreferences, saveBest, saveSize } from "./storage.ts";
import { newSeed } from "./randomSeed.ts";

export type Announcement = Readonly<{ id: number; text: string }>;
export type SessionView = Readonly<{
  game: GameState;
  paused: boolean;
  generation: number;
  best: number | null;
  controlStatus: string | null;
  announcement: Announcement | null;
  celebration: number;
}>;

function initialView(): SessionView {
  const preferences = readPreferences();
  const size = preferences.size;
  const game = createGame(`np1-${size}-${newSeed()}`);
  if (!game) throw new Error("Unable to create a starting board.");
  return { game, paused: false, generation: 0, best: preferences.bests[size] ?? null, controlStatus: null, announcement: null, celebration: 0 };
}

export function useGameSession() {
  const [view, setView] = useState(initialView);
  const viewRef = useRef(view);
  const bestsRef = useRef(readPreferences().bests);
  const announcementId = useRef(0);
  const lastTime = useRef(performance.now());
  const activeClock = useRef(!document.hidden);

  function commit(next: SessionView): void {
    viewRef.current = next;
    setView(next);
  }

  function announce(text: string): Announcement {
    announcementId.current += 1;
    return { id: announcementId.current, text };
  }

  function advanceClock(now: number): GameState {
    const delta = Math.max(0, now - lastTime.current);
    lastTime.current = now;
    const current = viewRef.current;
    if (!activeClock.current || !current.game.started || isWon(current.game)) return current.game;
    const game = advanceGame(current.game, delta);
    if (game !== current.game) commit({ ...current, game });
    if (isWon(game)) activeClock.current = false;
    return game;
  }

  useEffect(() => {
    lastTime.current = performance.now();
    activeClock.current = !document.hidden && !viewRef.current.paused && !isWon(viewRef.current.game);
    const timer = window.setInterval(() => advanceClock(performance.now()), 50);
    const visibilityChange = (): void => {
      const now = performance.now();
      advanceClock(now);
      activeClock.current = !document.hidden && !viewRef.current.paused && !isWon(viewRef.current.game);
      lastTime.current = now;
    };
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibilityChange);
      activeClock.current = false;
    };
  }, []);

  function replaceGame(game: GameState, paused: boolean, status: string | null): void {
    const now = performance.now();
    lastTime.current = now;
    activeClock.current = !document.hidden && !paused && !isWon(game);
    saveSize(game.board.size);
    commit({
      game,
      paused,
      generation: viewRef.current.generation + 1,
      best: bestsRef.current[game.board.size] ?? null,
      controlStatus: status,
      announcement: status === null ? null : announce(status),
      celebration: 0,
    });
  }

  function freshGame(size: GridSize, current: GameState): GameState {
    const seed = newSeed(current.board.seed);
    const game = createGame(`np1-${size}-${seed}`);
    if (!game) throw new Error("Unable to create a board for a supported size.");
    return game;
  }

  function activate(index: number): void {
    const before = advanceClock(performance.now());
    if (viewRef.current.paused) return;
    const next = activateCard(before, index);
    if (next === before) return;
    const turnEnded = before.selection.kind === SELECTION_KIND.one;
    const completedNow = !isWon(before) && isWon(next);
    const text = turnEnded
      ? next.selection.kind === SELECTION_KIND.mismatch
        ? "No match. Cards close after a short pause."
        : completedNow
          ? `Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`
          : `Pair found. ${next.matched.length / 2} ${next.matched.length === 2 ? "pair" : "pairs"} matched.`
      : null;
    let best = viewRef.current.best;
    if (completedNow) {
      const recorded = bestsRef.current[next.board.size];
      if (recorded === undefined || next.moves < recorded) {
        bestsRef.current = { ...bestsRef.current, [next.board.size]: next.moves };
        best = next.moves;
        saveBest(next.board.size, next.moves);
      }
    }
    if (isWon(next)) activeClock.current = false;
    commit({
      ...viewRef.current,
      game: next,
      best,
      announcement: text === null ? viewRef.current.announcement : announce(text),
      celebration: completedNow ? viewRef.current.celebration + 1 : viewRef.current.celebration,
    });
  }

  function startNew(): void {
    const current = viewRef.current.game;
    replaceGame(freshGame(current.board.size, current), false, null);
  }

  function restart(): void {
    const game = createGame(viewRef.current.game.board.code);
    if (game) replaceGame(game, false, null);
  }

  function changeSize(value: string): void {
    const size = Number(value);
    if (!isGridSize(size) || size === viewRef.current.game.board.size) return;
    replaceGame(freshGame(size, viewRef.current.game), false, null);
  }

  function loadBoard(draft: string): void {
    const game = createGame(draft.trim());
    if (!game) {
      const status = "Invalid board code.";
      commit({ ...viewRef.current, controlStatus: status, announcement: announce(status) });
      return;
    }
    replaceGame(game, false, null);
  }

  function snapshot(): string {
    return encodeSnapshot(advanceClock(performance.now()));
  }

  function loadSnapshot(text: string): void {
    const game = decodeSnapshot(text);
    if (!game) {
      const status = "Invalid snapshot.";
      commit({ ...viewRef.current, controlStatus: status, announcement: announce(status) });
      return;
    }
    const complete = isWon(game);
    replaceGame(game, !complete, complete ? "Loaded completed snapshot." : "Loaded snapshot. Select Resume to continue.");
  }

  function resume(): void {
    const current = viewRef.current;
    if (!current.paused) return;
    lastTime.current = performance.now();
    activeClock.current = !document.hidden && !isWon(current.game);
    commit({ ...current, paused: false });
  }

  return {
    view,
    actions: { activate, startNew, restart, changeSize, loadBoard, snapshot, loadSnapshot, resume },
    sizes: GRID_SIZES,
  } as const;
}
