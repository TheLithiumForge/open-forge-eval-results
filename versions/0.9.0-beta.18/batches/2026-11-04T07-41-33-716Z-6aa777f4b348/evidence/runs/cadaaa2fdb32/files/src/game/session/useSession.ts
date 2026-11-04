import { useCallback, useRef, useState } from 'react';
import type { Size } from '../boardCode.ts';
import { activateCard, advanceGame, MAX_ELAPSED_MS } from '../rules.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { turnAnnouncement } from './announcements.ts';
import { freshGame } from './freshGame.ts';
import { readPreferences, savePreferences } from './storage.ts';
import { useActiveClock } from './useActiveClock.ts';

export function useSession() {
  const [preferences, setPreferences] = useState(readPreferences);
  const [game, setGame] = useState(() => freshGame(preferences.size));
  const current = useRef(game);
  const [generation, setGeneration] = useState(0);
  const [paused, setPaused] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [announcement, setAnnouncement] = useState({ id: 0, text: '' });
  const [status, setStatus] = useState('');
  const [boardDraft, setBoardDraft] = useState(game.board.code);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  const commit = useCallback((next: GameState) => {
    if (next !== current.current) { current.current = next; setGame(next); }
  }, []);
  const advance = useCallback((ms: number) => {
    const before = current.current;
    const next = advanceGame(before, ms);
    current.current = next;
    // Keep precise time in memory; render only when visible information changes.
    if (Math.floor(before.elapsedMs / 1000) !== Math.floor(next.elapsedMs / 1000) ||
        before.selection.kind !== next.selection.kind) setGame(next);
  }, []);
  const nextDelay = useCallback(() => {
    const state = current.current;
    const clockDelay = state.elapsedMs < MAX_ELAPSED_MS ? 1000 - state.elapsedMs % 1000 : Infinity;
    return state.selection.kind === 'mismatch'
      ? Math.min(clockDelay, state.selection.remainingMs) : clockDelay;
  }, []);
  const settle = useActiveClock(game.started && !isWon(game) && !paused,
    generation, game.selection.kind, advance, nextDelay);

  const announce = useCallback((text: string) => {
    setAnnouncement(previous => ({ id: previous.id + 1, text }));
  }, []);
  function loadStatus(text: string) { setStatus(text); announce(text); }
  function rememberSize(size: Size) {
    const next = { ...preferences, size };
    setPreferences(next);
    savePreferences(next);
  }
  function replace(next: GameState, imported = false) {
    commit(next);
    setGeneration(value => value + 1);
    setPaused(imported && !isWon(next));
    setCelebrate(false);
    setStatus('');
    announce('');
    setBoardDraft(next.board.code);
    rememberSize(next.board.size);
  }
  const activate = useCallback((index: number) => {
    if (paused || document.hidden) return;
    settle();
    const before = current.current;
    const after = activateCard(before, index);
    commit(after);
    if (before.selection.kind === 'one' && after !== before) {
      announce(turnAnnouncement(after));
      if (isWon(after)) {
        setCelebrate(true);
        const best = preferences.best[after.board.size];
        if (best === undefined || after.moves < best) {
          const next = { ...preferences,
            best: { ...preferences.best, [after.board.size]: after.moves } };
          setPreferences(next);
          savePreferences(next);
        }
      }
    }
  }, [paused, settle, commit, announce, preferences]);
  function newGame(size = current.current.board.size) {
    replace(freshGame(size, current.current.board.seed));
  }
  function restart() {
    const next = createGame(current.current.board.code);
    if (next) replace(next);
  }
  function loadBoard() {
    const next = createGame(boardDraft.trim());
    if (!next) { loadStatus('Invalid board code.'); return; }
    replace(next);
  }
  function loadSnapshot() {
    const next = decodeSnapshot(snapshotDraft);
    if (!next) { loadStatus('Invalid snapshot.'); return; }
    replace(next, true);
    loadStatus(isWon(next) ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
  }
  function exportSnapshot() {
    settle();
    setSnapshotDraft(encodeSnapshot(current.current));
  }
  return { game, generation, paused, celebrate, announcement, status,
    best: preferences.best[game.board.size], boardDraft, setBoardDraft,
    snapshotDraft, setSnapshotDraft, activate, newGame, restart, loadBoard,
    loadSnapshot, exportSnapshot, resume: () => { settle(); setPaused(false); } };
}
