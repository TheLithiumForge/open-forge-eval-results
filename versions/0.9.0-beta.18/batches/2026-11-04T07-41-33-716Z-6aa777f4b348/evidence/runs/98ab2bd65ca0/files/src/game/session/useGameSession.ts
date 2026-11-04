import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { GameSession } from "./session.ts";
import type { GameSessionView } from "./types.ts";

export interface GameSessionActions {
  readonly activateCard: (index: number) => void;
  readonly changeSize: (size: number) => void;
  readonly exportSnapshot: () => string;
  readonly loadBoard: (draft: string) => void;
  readonly loadSnapshot: (text: string) => void;
  readonly newGame: () => void;
  readonly restart: () => void;
  readonly resume: () => void;
}

export type GameSessionApi = GameSessionView & GameSessionActions;

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function useGameSession(): GameSessionApi {
  const reference = useRef<GameSession | null>(null);
  if (reference.current === null) {
    reference.current = new GameSession({ storage: browserStorage() });
  }
  const session = reference.current;
  const view = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );

  useEffect(() => {
    const updateVisibility = (): void => {
      session.setVisible(document.visibilityState !== "hidden", performance.now());
    };
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, [session]);

  useEffect(() => {
    if (!view.running) return undefined;
    const revision = view.dealRevision;
    let active = true;
    let frame = 0;
    const update = (timestamp: number): void => {
      if (!active || session.getSnapshot().dealRevision !== revision) return;
      session.tick(timestamp);
      if (session.shouldTick()) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [session, view.dealRevision, view.running]);

  const mismatchRemainingMs = view.game.selection.kind === "mismatch"
    ? view.game.selection.remainingMs
    : null;

  useEffect(() => {
    if (!view.running || mismatchRemainingMs === null) return undefined;
    const revision = view.dealRevision;
    const timeout = window.setTimeout(() => {
      if (session.getSnapshot().dealRevision === revision) session.tick(performance.now());
    }, mismatchRemainingMs);
    return () => window.clearTimeout(timeout);
  }, [session, view.dealRevision, view.running, mismatchRemainingMs]);

  const actions = useMemo<GameSessionActions>(() => ({
    activateCard: (index) => session.activateCard(index),
    changeSize: (size) => session.changeSize(size),
    exportSnapshot: () => session.exportSnapshot(),
    loadBoard: (draft) => session.loadBoard(draft),
    loadSnapshot: (text) => session.loadSnapshot(text),
    newGame: () => session.newGame(),
    restart: () => session.restart(),
    resume: () => session.resume(),
  }), [session]);

  return { ...view, ...actions };
}
