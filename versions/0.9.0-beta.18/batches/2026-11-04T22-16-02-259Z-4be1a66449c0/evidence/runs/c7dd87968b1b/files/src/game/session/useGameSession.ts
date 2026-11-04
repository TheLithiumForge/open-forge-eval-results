import { useRef, useState } from 'react';
import { createGame } from '../createGame.ts';
import { parseBoardCode } from '../board/boardCode.ts';
import { isGridSize, type GridSize } from '../board/sizes.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { advanceGame, activateCard, isWon, pairCount } from '../transitions.ts';
import type { GameState } from '../types.ts';
import { readBestScores, readPreferredSize, saveBestScores, savePreferredSize, type BestScores } from './storage.ts';
import { useActiveClock } from './useActiveClock.ts';

function freshCode(size: GridSize): string {
  const value = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(value);
  else value[0] = Math.floor(Math.random() * 2_147_483_646);
  return `np1-${size}-${(value[0] ?? 0) % 2_147_483_646 + 1}`;
}

function makeGame(size: GridSize, previousCode?: string): GameState {
  let code = freshCode(size);
  if (code === previousCode) {
    const seed = Number(code.slice(code.lastIndexOf('-') + 1));
    code = `np1-${size}-${seed === 2_147_483_646 ? 1 : seed + 1}`;
  }
  const game = createGame(code);
  if (!game) throw new Error('Could not create a new board.');
  return game;
}

export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export type GameSession = {
  game: GameState;
  size: GridSize;
  best: BestScores;
  paused: boolean;
  epoch: number;
  boardCodeDraft: string;
  snapshotDraft: string;
  status: string;
  announcement: string;
  announcementId: number;
  completionPulse: number;
  activate: (index: number) => void;
  setBoardCodeDraft: (value: string) => void;
  setSnapshotDraft: (value: string) => void;
  loadBoard: () => void;
  loadSnapshot: () => void;
  exportSnapshot: () => void;
  startNew: () => void;
  restart: () => void;
  chooseSize: (value: string) => void;
  resume: (focusBoard: () => void) => void;
};

export function useGameSession(): GameSession {
  const [size, setSize] = useState(readPreferredSize);
  const [game, setGame] = useState(() => makeGame(readPreferredSize()));
  const gameRef = useRef(game);
  gameRef.current = game;
  const epochRef = useRef(0);
  const [epoch, setEpoch] = useState(0);
  const [best, setBest] = useState(readBestScores);
  const bestRef = useRef(best);
  bestRef.current = best;
  const [paused, setPaused] = useState(false);
  const [boardCodeDraft, setBoardCodeDraft] = useState(game.board.boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  const [status, setStatus] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [announcementId, setAnnouncementId] = useState(0);
  const [completionPulse, setCompletionPulse] = useState(0);
  const flushNow = useActiveClock(gameRef, setGame, epoch, epochRef, paused);

  const replaceGame = (next: GameState, nextSize: GridSize, isPaused: boolean): void => {
    epochRef.current += 1;
    setEpoch(epochRef.current);
    gameRef.current = next;
    setGame(next);
    setSize(nextSize);
    setPaused(isPaused);
    setBoardCodeDraft(next.board.boardCode);
    setStatus('');
    setAnnouncement('');
    setCompletionPulse(0);
    savePreferredSize(nextSize);
  };

  const startNew = (): void => {
    const next = makeGame(size, gameRef.current.board.boardCode);
    replaceGame(next, size, false);
  };
  const restart = (): void => {
    const next = createGame(gameRef.current.board.boardCode);
    if (next) replaceGame(next, next.board.size, false);
  };
  const chooseSize = (value: string): void => {
    const nextSize = Number(value);
    if (!isGridSize(nextSize)) return;
    replaceGame(makeGame(nextSize), nextSize, false);
  };
  const activate = (index: number): void => {
    if (paused) return;
    flushNow();
    const before = gameRef.current;
    const next = activateCard(before, index);
    if (next === before) return;
    gameRef.current = next;
    setGame(next);
    const resolvedTurn = before.selection.kind === 'one' && before.selection.index !== index && next.selection.kind !== 'one';
    if (resolvedTurn) {
      let result: string;
      if (next.matched.length > before.matched.length && isWon(next)) {
        result = `Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`;
      } else if (next.matched.length > before.matched.length) {
        const pairs = pairCount(next);
        result = `Pair found. ${pairs === 1 ? '1 pair' : `${pairs} pairs`} matched.`;
      } else result = 'No match. Cards close after a short pause.';
      setAnnouncement(result);
      setAnnouncementId((current) => current + 1);
    }
    if (!isWon(before) && isWon(next)) {
      setCompletionPulse((current) => current + 1);
      const oldBest = bestRef.current[next.board.size];
      if (oldBest === undefined || next.moves < oldBest) {
        const updated = { ...bestRef.current, [next.board.size]: next.moves };
        bestRef.current = updated;
        setBest(updated);
        saveBestScores(updated);
      }
    }
  };

  const loadBoard = (): void => {
    const parsed = parseBoardCode(boardCodeDraft.trim());
    const next = parsed ? createGame(parsed.code) : null;
    if (!next) { setStatus('Invalid board code.'); setAnnouncement('Invalid board code.'); setAnnouncementId((id) => id + 1); return; }
    replaceGame(next, next.board.size, false);
    setStatus('');
    setAnnouncement('');
    setAnnouncementId((id) => id + 1);
  };
  const loadSnapshot = (): void => {
    const next = decodeSnapshot(snapshotDraft);
    if (!next) { setStatus('Invalid snapshot.'); setAnnouncement('Invalid snapshot.'); setAnnouncementId((id) => id + 1); return; }
    const complete = isWon(next);
    replaceGame(next, next.board.size, !complete);
    const message = complete ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.';
    setStatus(message);
    setAnnouncement(message);
    setAnnouncementId((id) => id + 1);
  };
  const exportSnapshot = (): void => {
    flushNow();
    setSnapshotDraft(encodeSnapshot(gameRef.current));
    setStatus('Snapshot exported.');
  };
  const resume = (focusBoard: () => void): void => {
    if (!paused) return;
    focusBoard();
    setStatus('');
    setPaused(false);
  };

  return {
    game, size, best, paused, epoch, boardCodeDraft, snapshotDraft, status, announcement, announcementId, completionPulse,
    activate,
    setBoardCodeDraft: (value) => setBoardCodeDraft(value),
    setSnapshotDraft: (value) => setSnapshotDraft(value.slice(0, 65_536)),
    loadBoard, loadSnapshot, exportSnapshot, startNew, restart, chooseSize, resume,
  };
}
