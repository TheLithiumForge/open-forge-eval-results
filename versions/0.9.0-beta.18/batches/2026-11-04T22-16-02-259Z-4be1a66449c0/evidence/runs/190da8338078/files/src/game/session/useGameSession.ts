import { useCallback, useEffect, useRef, useState } from 'react';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { parseBoardCode } from '../board/deal.ts';
import { formatTime } from '../timeFormat.ts';
import { activateCard, advanceGame, createGame, isWon, pairCount } from '../transition.ts';
import type { BoardSize, GameState } from '../types.ts';
import { freshBoardCode } from './freshCode.ts';
import { readBestRecords, readLastSize, saveBestIfBetter, saveLastSize, type BestRecords } from './storage.ts';

function freshGame(size: BoardSize): GameState {
  const game = createGame(freshBoardCode(size));
  if (!game) throw new Error('Generated an invalid board code.');
  return game;
}

export function useGameSession() {
  const [size, setSize] = useState<BoardSize>(() => readLastSize() ?? 4);
  const [game, setGame] = useState<GameState>(() => freshGame(size));
  const [paused, setPaused] = useState(false);
  const [bestRecords, setBestRecords] = useState<BestRecords>(() => readBestRecords());
  const [boardDraft, setBoardDraft] = useState(game.board.code);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  const [controlStatus, setControlStatus] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [celebration, setCelebration] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const gameRef = useRef(game);
  const pausedRef = useRef(false);
  const epochRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const fractionalMsRef = useRef(0);
  const preparedStartRef = useRef(false);
  const announcementTimerRef = useRef<number | null>(null);
  const announcementQueueRef = useRef<string[]>([]);
  const announcementBusyRef = useRef(false);
  const tickRef = useRef<(force: boolean) => void>(() => undefined);

  const commit = useCallback((next: GameState) => { gameRef.current = next; setGame(next); }, []);
  const replace = (next: GameState, pause: boolean) => {
    epochRef.current += 1;
    lastTimeRef.current = null;
    fractionalMsRef.current = 0;
    preparedStartRef.current = false;
    gameRef.current = next;
    setGame(next);
    pausedRef.current = pause;
    setPaused(pause);
    setEpoch(epochRef.current);
    setBoardDraft(next.board.code);
    setCelebration(0);
  };
  const announce = useCallback((message: string) => {
    announcementQueueRef.current.push(message);
    if (announcementBusyRef.current) return;
    const showNext = () => {
      const next = announcementQueueRef.current.shift();
      if (next === undefined) { announcementBusyRef.current = false; return; }
      announcementBusyRef.current = true;
      setAnnouncement('');
      announcementTimerRef.current = window.setTimeout(() => {
        setAnnouncement(next);
        announcementTimerRef.current = window.setTimeout(() => {
          setAnnouncement('');
          announcementTimerRef.current = window.setTimeout(showNext, 25);
        }, 800);
      }, 25);
    };
    showNext();
  }, []);

  const tick = useCallback((force: boolean) => {
    if (pausedRef.current || (!force && document.hidden)) return;
    const now = performance.now();
    const last = lastTimeRef.current;
    lastTimeRef.current = now;
    if (last === null) return;
    const exact = now - last + fractionalMsRef.current;
    const whole = Math.floor(exact);
    fractionalMsRef.current = exact - whole;
    if (whole > 0) commit(advanceGame(gameRef.current, whole));
  }, [commit]);
  tickRef.current = tick;

  useEffect(() => {
    const won = isWon(game);
    const active = game.started && !won && !paused;
    if (!active) return;
    const callbackEpoch = epoch;
    if (!preparedStartRef.current) lastTimeRef.current = performance.now();
    preparedStartRef.current = false;
    const timer = window.setInterval(() => {
      if (epochRef.current === callbackEpoch) tickRef.current(false);
    }, 50);
    const visibility = () => {
      if (epochRef.current !== callbackEpoch) return;
      if (document.hidden) tickRef.current(true);
      else lastTimeRef.current = performance.now();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [epoch, game.started, game.board.code, paused, isWon(game), tick]);

  useEffect(() => () => {
    if (announcementTimerRef.current !== null) window.clearTimeout(announcementTimerRef.current);
    announcementQueueRef.current = [];
  }, []);

  const activate = useCallback((index: number) => {
    if (pausedRef.current || document.hidden) return;
    tickRef.current(true);
    const before = gameRef.current;
    const next = activateCard(before, index);
    if (next === before) return;
    if (!before.started && next.started) {
      lastTimeRef.current = performance.now();
      fractionalMsRef.current = 0;
      preparedStartRef.current = true;
    }
    commit(next);
    if (next.moves > before.moves) {
      const matched = pairCount(next) > pairCount(before);
      if (matched && isWon(next)) announce(`Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`);
      else if (matched) announce(`Pair found. ${pairCount(next)} ${pairCount(next) === 1 ? 'pair' : 'pairs'} matched.`);
      else announce('No match. Cards close after a short pause.');
      if (isWon(next) && !isWon(before)) {
        setBestRecords(saveBestIfBetter(next.board.size, next.moves));
        setCelebration((current) => current + 1);
      }
    }
  }, [announce, commit]);

  const startFresh = (nextSize = size) => {
    const next = freshGame(nextSize);
    replace(next, false);
    setSize(nextSize);
  };
  const changeSize = (nextSize: BoardSize) => {
    saveLastSize(nextSize);
    startFresh(nextSize);
  };
  const restart = () => {
    const next = createGame(gameRef.current.board.code);
    if (next) replace(next, false);
  };
  const loadBoard = () => {
    const board = parseBoardCode(boardDraft.trim());
    if (!board) { reportControl('Invalid board code.'); return; }
    const next = createGame(board.code);
    if (!next) { reportControl('Invalid board code.'); return; }
    replace(next, false);
    setSize(board.size);
    saveLastSize(board.size);
  };
  const loadSnapshot = () => {
    const next = decodeSnapshot(snapshotDraft);
    if (!next) { reportControl('Invalid snapshot.'); return; }
    const completed = isWon(next);
    replace(next, !completed);
    setSize(next.board.size);
    saveLastSize(next.board.size);
    reportControl(completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
  };
  const reportControl = (message: string) => {
    setControlStatus(message);
    announce(message);
  };
  const resume = () => { pausedRef.current = false; setPaused(false); };
  const exportSnapshot = () => {
    let snapshotState = gameRef.current;
    if (!pausedRef.current && !document.hidden && lastTimeRef.current !== null) {
      const activeMilliseconds = Math.floor(performance.now() - lastTimeRef.current + fractionalMsRef.current);
      if (activeMilliseconds > 0) snapshotState = advanceGame(snapshotState, activeMilliseconds);
    }
    setSnapshotDraft(encodeSnapshot(snapshotState));
  };
  const best = bestRecords[size];

  return {
    game, size, paused, best, boardDraft, snapshotDraft, controlStatus, announcement, celebration, epoch,
    setBoardDraft, setSnapshotDraft, activate, startFresh, changeSize, restart, loadBoard, loadSnapshot, resume, exportSnapshot,
  };
}

