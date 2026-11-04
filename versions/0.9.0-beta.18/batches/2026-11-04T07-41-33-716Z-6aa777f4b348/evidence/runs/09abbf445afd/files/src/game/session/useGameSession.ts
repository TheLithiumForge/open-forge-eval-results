import { useCallback, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { BoardSize } from '../constants.ts';
import { createGame, isWon } from '../transitions.ts';
import type { GameState } from '../types.ts';
import type { GameSession } from './sessionTypes.ts';
import { readPreferences, writePreferences, type SessionPreferences } from './storage.ts';
import { useActiveClock } from './useActiveClock.ts';
import type { SessionAnnouncement } from './sessionTypes.ts';
import { useMismatchTimer } from './useMismatchTimer.ts';
import { useSessionActions } from './useSessionActions.ts';
import { freshBoardCode } from './freshBoard.ts';

function initialGame(size: BoardSize): GameState {
  const game = createGame(freshBoardCode(size));
  if (game === null) throw new Error('Could not create an initial game.');
  return game;
}

export function useGameSession(): GameSession {
  const [preferences, setPreferences] = useState<SessionPreferences>(readPreferences);
  const [state, setState] = useState<GameState>(() => initialGame(preferences.size));
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(() =>
    typeof document === 'undefined' || document.visibilityState !== 'hidden',
  );
  const [revision, setRevision] = useState(0);
  const [turnNumber, setTurnNumber] = useState(0);
  const [celebration, setCelebration] = useState(false);
  const [announcement, setAnnouncement] = useState<SessionAnnouncement | null>(null);
  const [loadStatus, setLoadStatus] = useState('');
  const gameRef = useRef(state);
  const preferencesRef = useRef(preferences);
  const pausedRef = useRef(paused);
  const visibleRef = useRef(visible);
  const activeAtRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const turnNumberRef = useRef(0);
  const announcementIdRef = useRef(0);
  const refs = useMemo(() => ({
    game: gameRef,
    preferences: preferencesRef,
    paused: pausedRef,
    visible: visibleRef,
    activeAt: activeAtRef,
    generation: generationRef,
    mismatchTurn: turnNumberRef,
  }), []);
  preferencesRef.current = preferences;
  pausedRef.current = paused;
  visibleRef.current = visible;

  const clockRunning = state.started && !isWon(state) && !paused && visible;
  const flushAt = useActiveClock(refs, clockRunning, revision, setState, setVisible);
  useMismatchTimer(state.selection, clockRunning, revision, generationRef, turnNumber, turnNumberRef, gameRef, flushAt);

  const notify = useCallback((text: string): void => {
    announcementIdRef.current += 1;
    setAnnouncement({ id: announcementIdRef.current, text });
  }, []);
  const persist = useCallback((next: SessionPreferences): void => {
    preferencesRef.current = next;
    setPreferences(next);
    writePreferences(next);
  }, []);
  const setPause = useCallback((next: boolean): void => {
    pausedRef.current = next;
    setPaused(next);
  }, []);
  const commitGame = useCallback((next: GameState): void => {
    gameRef.current = next;
    setState(next);
  }, []);
  const replaceGame = useCallback((next: GameState, pauseForResume: boolean): void => {
    generationRef.current += 1;
    activeAtRef.current = null;
    commitGame(next);
    setPause(pauseForResume);
    setRevision((current) => current + 1);
    setCelebration(false);
  }, [commitGame, setPause]);
  const nextTurn = useCallback((): void => {
    turnNumberRef.current += 1;
    setTurnNumber(turnNumberRef.current);
  }, []);
  const updates = useMemo(() => ({
    flushAt,
    commitGame,
    notify,
    nextTurn,
    persist,
    replaceGame,
    setCelebration,
    setLoadStatus,
    setPause,
  }), [commitGame, flushAt, nextTurn, notify, persist, replaceGame, setPause]);
  const actions = useSessionActions(refs, updates);

  return {
    state,
    paused,
    revision,
    best: preferences.bestScores[state.board.size] ?? null,
    celebration,
    announcement,
    loadStatus,
    ...actions,
  };
}
