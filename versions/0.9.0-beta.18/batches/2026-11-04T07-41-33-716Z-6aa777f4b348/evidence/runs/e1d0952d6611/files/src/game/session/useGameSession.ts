import { useRef, useState } from 'react';
import { createGame } from '../state.ts';
import { activateCard, isWon } from '../transitions.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { parseBoardCode, type GridSize } from '../deal.ts';
import type { GameState } from '../state.ts';
import { readSettings, withBest, writeSettings, type SavedSettings } from './preferences.ts';
import { useGameClock } from './useGameClock.ts';

const MAX_SEED = 2_147_483_646;
export type TurnResult = Readonly<{ kind: 'match' | 'miss'; pairs: number; won: boolean; moves: number; elapsedMs: number }>;
export type SnapshotLoad = 'invalid' | 'loaded' | 'completed';

function randomSeed(): number {
  try {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    const value = values[0];
    if (value !== undefined) return Math.floor(value / 4_294_967_296 * MAX_SEED) + 1;
  } catch { /* Use the browser's fallback random source. */ }
  return Math.floor(Math.random() * MAX_SEED) + 1;
}

function newBoardCode(size: GridSize, previous: string): string {
  const seed = randomSeed();
  const candidate = `np1-${size}-${seed}`;
  return candidate === previous ? `np1-${size}-${seed === MAX_SEED ? 1 : seed + 1}` : candidate;
}

function initialGame(size: GridSize): GameState {
  const game = createGame(newBoardCode(size, ''));
  if (game === null) throw new Error('A generated board code must be valid.');
  return game;
}

export function useGameSession() {
  const [settings, setSettings] = useState<SavedSettings>(readSettings);
  const settingsRef = useRef(settings);
  const [game, setGame] = useState(() => initialGame(settings.size));
  const stateRef = useRef(game);
  const pausedRef = useRef(false);
  const [pausedImport, setPausedImport] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  function updateSettings(next: SavedSettings): void {
    if (next === settingsRef.current) return;
    settingsRef.current = next;
    setSettings(next);
    writeSettings(next);
  }

  function commit(next: GameState, recordWin: boolean): void {
    const previous = stateRef.current;
    if (next === previous) return;
    stateRef.current = next;
    setGame(next);
    if (recordWin && !isWon(previous) && isWon(next)) {
      updateSettings(withBest(settingsRef.current, previous.board.side, next.moves));
    }
  }

  function applyTime(next: GameState): void { commit(next, false); }
  const clock = useGameClock(stateRef, pausedRef, resetKey, applyTime);

  function beginReplacement(next: GameState, pause: boolean): void {
    clock.synchronize();
    clock.invalidateDeal();
    pausedRef.current = pause;
    setPausedImport(pause);
    stateRef.current = next;
    setGame(next);
    setResetKey((value) => value + 1);
    clock.setCurrentClock();
  }

  function newGame(): void {
    const current = stateRef.current;
    const next = createGame(newBoardCode(current.board.side, current.board.boardCode));
    if (next !== null) beginReplacement(next, false);
  }

  function restart(): void {
    const next = createGame(stateRef.current.board.boardCode);
    if (next !== null) beginReplacement(next, false);
  }

  function chooseSize(size: GridSize): void {
    const current = stateRef.current;
    if (size === current.board.side) return;
    const next = createGame(newBoardCode(size, current.board.boardCode));
    if (next !== null) {
      beginReplacement(next, false);
      updateSettings({ ...settingsRef.current, size });
    }
  }

  function loadBoard(input: string): boolean {
    const parsed = parseBoardCode(input.trim());
    if (parsed === null) return false;
    const next = createGame(parsed.boardCode);
    if (next === null) return false;
    beginReplacement(next, false);
    updateSettings({ ...settingsRef.current, size: next.board.side });
    return true;
  }

  function loadSnapshot(text: string): SnapshotLoad {
    const decoded = decodeSnapshot(text);
    if (decoded === null) return 'invalid';
    const complete = isWon(decoded);
    beginReplacement(decoded, !complete);
    updateSettings({ ...settingsRef.current, size: decoded.board.side });
    return complete ? 'completed' : 'loaded';
  }

  function resume(): void {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    setPausedImport(false);
    clock.setCurrentClock();
    clock.scheduleMismatch();
  }

  function activate(index: number): TurnResult | null {
    clock.synchronize();
    if (pausedRef.current || document.hidden) return null;
    const previous = stateRef.current;
    const next = activateCard(previous, index);
    if (next === previous) return null;
    const firstReveal = !previous.started && next.started;
    commit(next, true);
    if (firstReveal) clock.setCurrentClock();
    if (next.selection.kind === 'mismatch') clock.scheduleMismatch();
    if (previous.selection.kind !== 'one') return null;
    return { kind: next.selection.kind === 'mismatch' ? 'miss' : 'match',
      pairs: next.matched.length / 2, won: isWon(next), moves: next.moves, elapsedMs: next.elapsedMs };
  }

  function exportSnapshot(): string {
    clock.synchronize();
    return encodeSnapshot(stateRef.current);
  }

  return { game, settings, paused: pausedImport, resetKey, newGame, restart, chooseSize,
    loadBoard, loadSnapshot, resume, activate, exportSnapshot } as const;
}
