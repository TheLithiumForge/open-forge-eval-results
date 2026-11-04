import { useEffect, useRef, useState } from "react";
import { MAX_SEED } from "../boardCode.ts";
import { advanceGame, activateCard, createGame, isWon } from "../turns.ts";
import { type BestScores, type GameState, type SideLength } from "../model.ts";
import { readBestScores, readPreferredSize, saveBestScores, savePreferredSize } from "./storage.ts";

type SessionState = Readonly<{
  game: GameState;
  bestScores: BestScores;
  paused: boolean;
  celebration: boolean;
  revision: number;
}>;

export type TurnResult = Readonly<{ kind: "miss" }> | Readonly<{
  kind: "match";
  pairs: number;
  won: boolean;
  moves: number;
  elapsedMs: number;
}>;

function randomSeed(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const range = 0x1_0000_0000;
    const limit = Math.floor(range / MAX_SEED) * MAX_SEED;
    const value = new Uint32Array(1);
    do crypto.getRandomValues(value); while (value[0]! >= limit);
    return (value[0]! % MAX_SEED) + 1;
  }
  return Math.floor(Math.random() * MAX_SEED) + 1;
}

function freshGame(side: SideLength, avoidSeed?: number): GameState {
  let seed = randomSeed();
  while (seed === avoidSeed) seed = randomSeed();
  const game = createGame(`np1-${side}-${seed}`);
  if (!game) throw new Error("Could not create a fresh deal");
  return game;
}

function initialSession(): SessionState {
  const side = readPreferredSize();
  return { game: freshGame(side), bestScores: readBestScores(), paused: false, celebration: false, revision: 0 };
}

export function useGameSession() {
  const [session, setSession] = useState(initialSession);
  const sessionRef = useRef(session);
  const clockRef = useRef({ last: 0, fraction: 0 });
  const pulseRef = useRef<(includeTransitionTime?: boolean) => void>(() => undefined);
  sessionRef.current = session;

  const commit = (next: SessionState) => {
    sessionRef.current = next;
    setSession(next);
  };

  pulseRef.current = (includeTransitionTime = false) => {
    const now = performance.now();
    const elapsed = Math.max(0, now - clockRef.current.last);
    clockRef.current.last = now;
    const visible = document.visibilityState === "visible" || includeTransitionTime;
    const current = sessionRef.current;
    if (!visible || current.paused || !current.game.started || isWon(current.game)) {
      clockRef.current.fraction = 0;
      return;
    }
    clockRef.current.fraction += elapsed;
    const whole = Math.floor(clockRef.current.fraction);
    clockRef.current.fraction -= whole;
    if (whole === 0) return;
    const game = advanceGame(current.game, whole);
    if (game !== current.game) commit({ ...current, game });
  };

  useEffect(() => {
    clockRef.current.last = performance.now();
    const timer = window.setInterval(() => pulseRef.current(), 20);
    const visibilityChanged = () => {
      if (document.visibilityState === "hidden") {
        pulseRef.current(true);
        clockRef.current.last = performance.now();
      } else {
        clockRef.current.last = performance.now();
        clockRef.current.fraction = 0;
      }
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, []);

  const replaceGame = (game: GameState, paused = false) => {
    clockRef.current.last = performance.now();
    clockRef.current.fraction = 0;
    const current = sessionRef.current;
    commit({ ...current, game, paused, celebration: false, revision: current.revision + 1 });
    savePreferredSize(game.board.side);
  };

  const newGame = () => replaceGame(freshGame(sessionRef.current.game.board.side, sessionRef.current.game.board.seed));

  const restart = () => {
    const game = createGame(sessionRef.current.game.board.code);
    if (game) replaceGame(game);
  };

  const chooseSize = (side: SideLength) => replaceGame(freshGame(side));

  const loadBoard = (code: string): boolean => {
    const game = createGame(code.trim());
    if (!game) return false;
    replaceGame(game);
    return true;
  };

  const loadSnapshot = (game: GameState): void => replaceGame(game, !isWon(game));

  const resume = () => {
    const current = sessionRef.current;
    if (!current.paused) return;
    clockRef.current.last = performance.now();
    clockRef.current.fraction = 0;
    commit({ ...current, paused: false });
  };

  const activate = (index: number): TurnResult | null => {
    const current = sessionRef.current;
    if (current.paused) return null;
    const previous = current.game;
    const game = activateCard(previous, index);
    if (game === previous) return null;
    let result: TurnResult | null = null;
    if (previous.selection.kind === "one") {
      if (game.selection.kind === "mismatch") result = { kind: "miss" };
      else if (game.matched.length > previous.matched.length) {
        result = { kind: "match", pairs: game.matched.length / 2, won: isWon(game), moves: game.moves, elapsedMs: game.elapsedMs };
      }
    }
    let bestScores = current.bestScores;
    const won = result?.kind === "match" && result.won;
    const best = current.bestScores[game.board.side];
    if (won && (best === undefined || game.moves < best)) {
      bestScores = { ...current.bestScores, [game.board.side]: game.moves };
      saveBestScores(bestScores);
    }
    if (!previous.started && game.started) {
      clockRef.current.last = performance.now();
      clockRef.current.fraction = 0;
    }
    commit({ ...current, game, bestScores, celebration: Boolean(won) });
    return result;
  };

  return { ...session, activate, chooseSize, newGame, restart, loadBoard, loadSnapshot, resume };
}
