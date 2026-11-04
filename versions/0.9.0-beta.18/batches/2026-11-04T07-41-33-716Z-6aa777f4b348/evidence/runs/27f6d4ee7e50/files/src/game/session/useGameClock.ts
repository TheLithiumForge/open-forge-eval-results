import { useEffect, useRef, useState } from "react";
import { advanceGame, isWon, MAX_ELAPSED_MS } from "../state.ts";
import type { GameState } from "../state.ts";

interface ClockSession {
  readonly game: GameState;
  readonly paused: boolean;
}

function canRun(session: ClockSession): boolean {
  return session.game.started && !session.paused && !isWon(session.game) && !document.hidden;
}

export function useGameClock(
  game: GameState,
  paused: boolean,
  readSession: () => ClockSession,
  advance: (milliseconds: number) => void,
) {
  const sample = useRef<number | null>(null);
  const active = useRef(false);
  const generation = useRef(0);
  const readLatest = useRef(readSession);
  const advanceLatest = useRef(advance);
  const [visibilityRevision, setVisibilityRevision] = useState(0);
  readLatest.current = readSession;
  advanceLatest.current = advance;

  const refresh = (): void => {
    active.current = canRun(readLatest.current());
  };

  const invalidate = (): void => {
    generation.current += 1;
    refresh();
  };

  const sync = (): void => {
    const now = performance.now();
    const delta = sample.current === null ? 0 : Math.max(0, now - sample.current);
    sample.current = now;
    const wasActive = active.current;
    refresh();
    if (wasActive && delta > 0) advanceLatest.current(delta);
  };

  const gameAtNow = (current: GameState): GameState => {
    if (!active.current || sample.current === null) return current;
    const delta = Math.max(0, performance.now() - sample.current);
    return advanceGame(current, delta);
  };

  useEffect(() => {
    sample.current = performance.now();
    refresh();
    const onVisibilityChange = (): void => {
      sync();
      setVisibilityRevision((revision) => revision + 1);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (paused || document.hidden || !game.started || isWon(game)) return;
    if (game.elapsedMs >= MAX_ELAPSED_MS && game.selection.kind !== "mismatch") return;
    const nextSecond = game.elapsedMs >= MAX_ELAPSED_MS
      ? Infinity : 1000 - (game.elapsedMs % 1000);
    const mismatchEnd = game.selection.kind === "mismatch" ? game.selection.remainingMs : Infinity;
    const delay = Math.max(1, Math.ceil(Math.min(nextSecond, mismatchEnd)));
    let current = true;
    const currentGeneration = generation.current;
    const timeout = window.setTimeout(() => {
      if (current && currentGeneration === generation.current) sync();
    }, delay);
    return () => {
      current = false;
      generation.current += 1;
      window.clearTimeout(timeout);
    };
  }, [game, paused, visibilityRevision]);

  return { sync, refresh, invalidate, gameAtNow };
}
