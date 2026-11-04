import { useCallback, useRef, useState } from 'react';
import type { GridSize } from '../types';
import { createGame, advanceGame, activateCard, isWon } from '../state';
import { decodeSnapshot, encodeSnapshot } from '../snapshot';
import { readBestScores, readSavedSize, saveBestScores, saveSize } from './storage';
import { formatTime, turnResult } from './format';
import { useActiveClock } from './useActiveClock';

type Announcement = Readonly<{ id: number; text: string }>;

export function useGameSession() {
  const [game, setGame] = useState(() => freshGame(readSavedSize() ?? 4));
  const gameRef = useRef(game);
  const [revision, setRevision] = useState(0);
  const revisionRef = useRef(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [boardDraft, setBoardDraft] = useState(game.board.code);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  const [bestScores, setBestScores] = useState(() => readBestScores());
  const bestRef = useRef(bestScores);
  const [announcement, setAnnouncement] = useState<Announcement>({ id: 0, text: '' });
  const announcementId = useRef(0);
  const [celebrate, setCelebrate] = useState(false);

  const commit = useCallback((next: typeof game) => {
    if (next === gameRef.current) return;
    gameRef.current = next;
    setGame(next);
  }, []);
  const advance = useCallback((milliseconds: number) => {
    commit(advanceGame(gameRef.current, milliseconds));
  }, [commit]);
  const syncClock = useActiveClock({ paused, revision, pausedRef, revisionRef, stateRef: gameRef, advance });

  const announce = useCallback((text: string) => {
    announcementId.current += 1;
    setAnnouncement({ id: announcementId.current, text });
  }, []);

  const replaceGame = useCallback((next: typeof game, shouldPause: boolean) => {
    revisionRef.current += 1;
    setRevision(revisionRef.current);
    commit(next);
    pausedRef.current = shouldPause;
    setPaused(shouldPause);
    setCelebrate(false);
    setBoardDraft(next.board.code);
  }, [commit]);

  const newGame = useCallback(() => {
    syncClock();
    replaceGame(freshGame(gameRef.current.board.size, gameRef.current.board.code), false);
  }, [replaceGame, syncClock]);

  const restart = useCallback(() => {
    syncClock();
    const next = createGame(gameRef.current.board.code);
    if (next) replaceGame(next, false);
  }, [replaceGame, syncClock]);

  const changeSize = useCallback((value: number) => {
    const size = parseSize(value);
    if (!size) return;
    syncClock();
    saveSize(size);
    replaceGame(freshGame(size, gameRef.current.board.code), false);
  }, [replaceGame, syncClock]);

  const loadBoard = useCallback(() => {
    syncClock();
    const next = createGame(boardDraft.trim());
    if (!next) { announce('Invalid board code.'); return; }
    saveSize(next.board.size);
    replaceGame(next, false);
  }, [announce, boardDraft, replaceGame, syncClock]);

  const exportSnapshot = useCallback(() => {
    setSnapshotDraft(encodeSnapshot(gameRef.current));
  }, []);

  const loadSnapshot = useCallback(() => {
    syncClock();
    const next = decodeSnapshot(snapshotDraft);
    if (!next) { announce('Invalid snapshot.'); return; }
    saveSize(next.board.size);
    const completed = isWon(next);
    replaceGame(next, !completed);
    announce(completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
  }, [announce, replaceGame, snapshotDraft, syncClock]);

  const activate = useCallback((index: number) => {
    if (pausedRef.current) return;
    syncClock();
    const previous = gameRef.current;
    const next = activateCard(previous, index);
    commit(next);
    const message = turnResult(previous, next);
    if (message) announce(message);
    if (!isWon(previous) && isWon(next)) {
      setCelebrate(true);
      const best = bestRef.current.get(next.board.size);
      if (best === undefined || next.moves < best) {
        const updated = new Map(bestRef.current);
        updated.set(next.board.size, next.moves);
        bestRef.current = updated;
        setBestScores(updated);
        saveBestScores(updated);
      }
    }
  }, [announce, commit, syncClock]);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
  }, []);

  return {
    game, paused, boardDraft, snapshotDraft, best: bestScores.get(game.board.size),
    announcement, celebrate, revision, setBoardDraft, setSnapshotDraft,
    newGame, restart, changeSize, loadBoard, exportSnapshot, loadSnapshot, activate, resume,
  };
}

function freshGame(size: GridSize, avoidCode?: string) {
  let code = '';
  do { code = `np1-${size}-${randomSeed()}`; } while (code === avoidCode);
  const game = createGame(code);
  if (!game) throw new Error('Could not create a game from a generated board code.');
  return game;
}

function randomSeed(): number {
  const values = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(values);
    return (values[0] ?? 0) % 2_147_483_646 + 1;
  }
  return Math.floor(Math.random() * 2_147_483_646) + 1;
}

function parseSize(value: number): GridSize | null {
  if (value === 4 || value === 6 || value === 8 || value === 10 || value === 12 || value === 14 || value === 16) return value;
  return null;
}
