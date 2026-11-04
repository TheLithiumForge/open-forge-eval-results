import { useEffect, useRef, useState } from 'react';
import { isBoardSize, type BoardSize } from '../constants.ts';
import { activateCard, advanceGame, createGame, isWon, type GameState } from '../core.ts';
import { decodeSnapshot, encodeSnapshot } from '../reproducibility/snapshot.ts';
import { createFreshBoardCode } from './deal.ts';
import { readBestScores, readGridSize, saveBestScores, saveGridSize, type BestScores } from './storage.ts';
import { formatElapsedTime } from './time.ts';

export interface Announcement { readonly id: number; readonly text: string }
export interface GameSession {
  readonly game: GameState;
  readonly boardCodeDraft: string;
  readonly snapshotDraft: string;
  readonly paused: boolean;
  readonly best: number | undefined;
  readonly announcement: Announcement;
  readonly resetToken: number;
  readonly resumeToken: number;
  readonly celebrating: boolean;
  readonly activate: (index: number) => void;
  readonly newGame: () => void;
  readonly restart: () => void;
  readonly selectSize: (value: string) => void;
  readonly setBoardCodeDraft: (value: string) => void;
  readonly setSnapshotDraft: (value: string) => void;
  readonly loadBoard: () => void;
  readonly exportSnapshot: () => void;
  readonly loadSnapshot: () => void;
  readonly resume: () => void;
}

export function useGameSession(): GameSession {
  const [size, setSize] = useState(readGridSize);
  const [game, setGame] = useState(() => {
    const initial = createGame(createFreshBoardCode(readGridSize()));
    if (initial === null) throw new Error('Fresh board code should be valid');
    return initial;
  });
  const [bestScores, setBestScores] = useState<BestScores>(readBestScores);
  const [boardCodeDraft, setBoardCodeDraft] = useState(game.boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  const [paused, setPaused] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement>({ id: 0, text: '' });
  const [resetToken, setResetToken] = useState(0);
  const [resumeToken, setResumeToken] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const gameRef = useRef(game);
  const pausedRef = useRef(false);
  const epochRef = useRef(0);
  const lastTick = useRef(performance.now());
  const announcementId = useRef(0);
  const eligibleForBest = useRef(true);
  const bestRecorded = useRef(false);
  gameRef.current = game;

  function commitGame(next: GameState): void {
    gameRef.current = next;
    setGame(next);
  }

  function advanceActiveTime(pageVisible = !document.hidden, now = performance.now()): GameState {
    const elapsed = Math.floor(now - lastTick.current);
    lastTick.current += elapsed;
    const current = gameRef.current;
    if (!pageVisible || pausedRef.current || elapsed <= 0 || !current.started || isWon(current)) return current;
    const next = advanceGame(current, elapsed);
    if (next !== current) commitGame(next);
    return next;
  }

  function announce(text: string): void {
    announcementId.current += 1;
    setAnnouncement({ id: announcementId.current, text });
  }

  function invalidateGame(): void {
    epochRef.current += 1;
    setEpoch(epochRef.current);
    setResetToken((value) => value + 1);
    lastTick.current = performance.now();
  }

  function replaceGame(next: GameState, codeDraft: string, nextPaused: boolean, recordsBest: boolean): void {
    invalidateGame();
    commitGame(next);
    setSize(next.size);
    saveGridSize(next.size);
    setBoardCodeDraft(codeDraft);
    pausedRef.current = nextPaused;
    setPaused(nextPaused);
    eligibleForBest.current = recordsBest;
    bestRecorded.current = false;
    setCelebrating(false);
  }

  useEffect(() => {
    const token = epoch;
    lastTick.current = performance.now();
    const tick = (): void => {
      if (epochRef.current === token) advanceActiveTime();
    };
    const onVisibility = (): void => {
      const now = performance.now();
      if (document.hidden) advanceActiveTime(true, now);
      else lastTick.current = now;
    };
    const timer = window.setInterval(tick, 50);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [epoch]);

  useEffect(() => {
    if (!isWon(game) || !eligibleForBest.current || bestRecorded.current) return;
    bestRecorded.current = true;
    setBestScores((current) => {
      const previous = current[game.size];
      if (previous !== undefined && previous <= game.moves) return current;
      const updated: BestScores = { ...current, [game.size]: game.moves };
      saveBestScores(updated);
      return updated;
    });
  }, [game]);

  function activate(index: number): void {
    if (pausedRef.current) return;
    const before = advanceActiveTime();
    const next = activateCard(before, index);
    if (next === before) return;
    if (!before.started && next.started) lastTick.current = performance.now();
    commitGame(next);
    if (before.selection.kind !== 'one' || next.moves === before.moves) return;
    if (next.matched.length > before.matched.length) {
      const final = isWon(next);
      announce(final
        ? `Pair found. All pairs found in ${next.moves} moves and ${formatElapsedTime(next.elapsedMs)}.`
        : `Pair found. ${next.matched.length / 2} ${next.matched.length === 2 ? 'pair' : 'pairs'} matched.`);
      if (final) setCelebrating(true);
    } else {
      announce('No match. Cards close after a short pause.');
    }
  }

  function start(code: string): void {
    const next = createGame(code);
    if (next === null) return;
    replaceGame(next, next.boardCode, false, true);
  }

  function newGame(): void { start(createFreshBoardCode(size)); }
  function restart(): void { start(game.boardCode); }

  function selectSize(value: string): void {
    const nextSize = Number(value);
    if (!isBoardSize(nextSize) || nextSize === size) return;
    setSize(nextSize);
    start(createFreshBoardCode(nextSize));
  }

  function loadBoard(): void {
    const next = createGame(boardCodeDraft.trim());
    if (next === null) { announce('Invalid board code.'); return; }
    replaceGame(next, next.boardCode, false, true);
    announce('Loaded board.');
  }

  function exportSnapshot(): void { setSnapshotDraft(encodeSnapshot(advanceActiveTime())); }

  function loadSnapshot(): void {
    const next = decodeSnapshot(snapshotDraft);
    if (next === null) { announce('Invalid snapshot.'); return; }
    const completed = isWon(next);
    replaceGame(next, next.boardCode, !completed, !completed);
    announce(completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
  }

  function resume(): void {
    if (!paused) return;
    lastTick.current = performance.now();
    pausedRef.current = false;
    setPaused(false);
    setResumeToken((value) => value + 1);
  }

  return {
    game, boardCodeDraft, snapshotDraft, paused, best: bestScores[size], announcement,
    resetToken, resumeToken, celebrating, activate, newGame, restart, selectSize,
    setBoardCodeDraft, setSnapshotDraft, loadBoard, exportSnapshot, loadSnapshot, resume,
  };
}
