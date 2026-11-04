import { useCallback, useEffect, useRef, useState } from "react";
import { createGame } from "../game";
import { activateCard, advanceGame, isWon, type GameState } from "../game";
import type { BoardSize } from "../constants";
import { decodeSnapshot } from "../snapshot";
import { freshGame } from "./deal";
import { readBestScores, readGridSize, writeBestScores, writeGridSize, type BestScores } from "./storage";

interface VersionedGame { readonly game: GameState; readonly generation: number; }

function initialSession(): VersionedGame {
  return { game: freshGame(readGridSize() ?? 4), generation: 0 };
}

export function useGameSession() {
  const [session, setSession] = useState(initialSession);
  const gameRef = useRef(session.game);
  const generationRef = useRef(session.generation);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const clockRef = useRef(Math.floor(performance.now()));
  const visibleRef = useRef(document.visibilityState === "visible");
  const [bestScores, setBestScores] = useState<BestScores>(readBestScores);
  const bestRef = useRef(bestScores);
  const [dealVersion, setDealVersion] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const advanceClock = useCallback(() => {
    const now = Math.floor(performance.now());
    const delta = Math.max(0, now - clockRef.current);
    clockRef.current = now;
    if (delta === 0 || !visibleRef.current || pausedRef.current) return;
    const generation = generationRef.current;
    const previous = gameRef.current;
    const game = advanceGame(previous, delta);
    if (generation !== generationRef.current || game === previous) return;
    gameRef.current = game;
    setSession({ game, generation });
  }, []);

  const replaceGame = useCallback((game: GameState, rememberSize = true, pause = false) => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    gameRef.current = game;
    pausedRef.current = pause;
    clockRef.current = Math.floor(performance.now());
    setSession({ game, generation });
    setPaused(pause);
    setCelebrating(false);
    setDealVersion((version) => version + 1);
    if (rememberSize) writeGridSize(game.board.size);
  }, []);

  useEffect(() => {
    const resetTime = () => {
      visibleRef.current = document.visibilityState === "visible";
      clockRef.current = Math.floor(performance.now());
    };
    document.addEventListener("visibilitychange", resetTime);
    resetTime();
    const timer = window.setInterval(advanceClock, 40);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", resetTime);
      generationRef.current += 1;
    };
  }, [advanceClock]);

  const activate = useCallback((index: number): { previous: GameState; next: GameState } => {
    if (!pausedRef.current) advanceClock();
    const previous = gameRef.current;
    const next = pausedRef.current ? previous : activateCard(previous, index);
    if (next !== previous) {
      gameRef.current = next;
      setSession({ game: next, generation: generationRef.current });
      if (!isWon(previous) && isWon(next)) {
        const currentBest = bestRef.current[next.board.size];
        if (currentBest === undefined || next.moves < currentBest) {
          const updated = { ...bestRef.current, [next.board.size]: next.moves };
          bestRef.current = updated;
          setBestScores(updated);
          writeBestScores(updated);
        }
        setCelebrating(true);
      }
    }
    return { previous, next };
  }, [advanceClock]);

  const newGame = useCallback(() => replaceGame(freshGame(gameRef.current.board.size, gameRef.current.board.code)), [replaceGame]);
  const restart = useCallback(() => {
    const game = createGame(gameRef.current.board.code);
    if (game !== null) replaceGame(game);
  }, [replaceGame]);
  const changeSize = useCallback((size: BoardSize) => replaceGame(freshGame(size)), [replaceGame]);
  const loadBoard = useCallback((code: string): boolean => {
    const game = createGame(code);
    if (game === null) return false;
    replaceGame(game);
    return true;
  }, [replaceGame]);
  const loadSnapshot = useCallback((text: string): GameState | null => {
    const game = decodeSnapshot(text);
    if (game === null) return null;
    const shouldPause = !isWon(game);
    replaceGame(game, true, shouldPause);
    return game;
  }, [replaceGame]);
  const resume = useCallback(() => {
    pausedRef.current = false;
    clockRef.current = Math.floor(performance.now());
    setPaused(false);
  }, []);
  const finishCelebration = useCallback(() => setCelebrating(false), []);

  return {
    game: session.game,
    paused,
    best: bestScores[session.game.board.size],
    dealVersion,
    celebrating,
    activate,
    newGame,
    restart,
    changeSize,
    loadBoard,
    loadSnapshot,
    resume,
    finishCelebration,
  };
}
