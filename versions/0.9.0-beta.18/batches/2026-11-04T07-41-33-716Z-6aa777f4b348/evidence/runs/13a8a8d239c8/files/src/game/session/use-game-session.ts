import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import { GRID_SIZES, isGridSize, parseBoardCode, type GridSize } from '../board.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import {
  activateCard as activateCardCore,
  createGame,
  isWon,
  type GameState,
} from '../state.ts';
import { newBoardCode } from './new-board-code.ts';
import { recordBestScore } from './best-score.ts';
import { turnAnnouncement } from './announcements.ts';
import { readBestScores, readSavedSize, saveBestScore, saveSize } from './storage.ts';
import { useSessionClock } from './use-session-clock.ts';

export interface SessionAnnouncement {
  readonly id: number;
  readonly text: string;
}

export interface GameSession {
  readonly game: GameState;
  readonly gridSizes: typeof GRID_SIZES;
  readonly bestMoves: number | null;
  readonly dealRevision: number;
  readonly snapshotPaused: boolean;
  readonly celebration: boolean;
  readonly announcement: SessionAnnouncement | null;
  readonly status: string;
  activateCard(index: number): void;
  newGame(): void;
  restart(): void;
  changeSize(size: GridSize): void;
  loadBoard(code: string): void;
  loadSnapshot(text: string): void;
  resume(): void;
  exportSnapshot(): string;
}

function initialGame(): GameState {
  const size = readSavedSize() ?? 4;
  const game = createGame(newBoardCode(size));
  if (game === null) throw new Error('Could not create a new deal.');
  return game;
}

export function useGameSession(): GameSession {
  const [game, setGame] = useState(initialGame);
  const gameRef = useRef(game);
  const [bestScores, setBestScores] = useState(readBestScores);
  const bestRef = useRef(bestScores);
  const [revision, setRevision] = useState(0);
  const revisionRef = useRef(0);
  const [snapshotPaused, setSnapshotPaused] = useState(false);
  const pausedRef = useRef(false);
  const [celebration, setCelebration] = useState(false);
  const [announcement, setAnnouncement] = useState<SessionAnnouncement | null>(null);
  const [status, setStatus] = useState('');
  const eventId = useRef(0);

  const commit = useCallback((next: GameState) => {
    gameRef.current = next;
    setGame(next);
  }, []);
  const clock = useSessionClock(game, gameRef, pausedRef, revisionRef, snapshotPaused, revision, commit);
  const publish = useCallback((text: string, visibleStatus = false) => {
    eventId.current += 1;
    setAnnouncement({ id: eventId.current, text });
    if (visibleStatus) setStatus(text);
  }, []);

  const replace = useCallback((next: GameState, paused = false) => {
    pausedRef.current = paused;
    setSnapshotPaused(paused);
    setCelebration(false);
    commit(next);
    revisionRef.current += 1;
    setRevision(revisionRef.current);
    clock.reset();
  }, [clock, commit]);

  const activateCard = useCallback((index: number) => {
    if (pausedRef.current) return;
    const before = clock.flush();
    const next = activateCardCore(before, index);
    if (next === before) return;
    commit(next);
    const result = turnAnnouncement(before, next);
    if (result === null) return;
    if (result.completed) {
      setCelebration(true);
      recordBestScore(next, bestRef, setBestScores);
    }
    publish(result.text);
  }, [bestRef, clock, commit, publish]);

  const start = useCallback((code: string) => {
    clock.flush();
    const next = createGame(code);
    if (next === null) return;
    replace(next);
    saveSize(next.board.size);
  }, [clock, replace]);

  const newGame = useCallback(() => {
    const current = clock.flush();
    start(newBoardCode(current.board.size, current.board.seed));
  }, [clock, start]);

  const restart = useCallback(() => {
    const current = clock.flush();
    start(current.board.boardCode);
  }, [clock, start]);

  const changeSize = useCallback((size: GridSize) => {
    if (!isGridSize(size) || gameRef.current.board.size === size) return;
    clock.flush();
    start(newBoardCode(size));
  }, [clock, start]);

  const loadBoard = useCallback((draft: string) => {
    clock.flush();
    const board = parseBoardCode(draft.trim());
    if (board === null) {
      publish('Invalid board code.', true);
      return;
    }
    const next = createGame(board.boardCode);
    if (next === null) return;
    replace(next);
    saveSize(next.board.size);
    publish('Loaded board.', true);
  }, [clock, publish, replace]);

  const loadSnapshot = useCallback((text: string) => {
    clock.flush();
    const next = decodeSnapshot(text);
    if (next === null) {
      publish('Invalid snapshot.', true);
      return;
    }
    const complete = isWon(next);
    replace(next, !complete);
    saveSize(next.board.size);
    publish(complete ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.', true);
  }, [clock, publish, replace]);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    setSnapshotPaused(false);
    clock.reset();
  }, [clock]);

  const exportSnapshot = useCallback(() => {
    const snapshot: unknown = JSON.parse(encodeSnapshot(clock.flush()));
    return JSON.stringify(snapshot, null, 2);
  }, [clock]);

  return {
    game,
    gridSizes: GRID_SIZES,
    bestMoves: bestScores.get(game.board.size) ?? null,
    dealRevision: revision,
    snapshotPaused,
    celebration,
    announcement,
    status,
    activateCard,
    newGame,
    restart,
    changeSize,
    loadBoard,
    loadSnapshot,
    resume,
    exportSnapshot,
  };
}
