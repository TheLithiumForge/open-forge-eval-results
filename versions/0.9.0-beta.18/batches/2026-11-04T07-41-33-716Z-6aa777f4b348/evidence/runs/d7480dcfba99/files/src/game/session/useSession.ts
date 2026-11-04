import { useEffect, useRef, useState } from 'react';
import type { Size } from '../boardCode.ts';
import { createGame, formatTime, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { activateCard, advanceGame } from '../transitions.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { browserStorage, freshGame } from './browser.ts';
import { readPreferences, writePreferences } from './storage.ts';

export function useSession() {
  const [storage] = useState(browserStorage);
  const [preferences, setPreferences] = useState(() => readPreferences(storage));
  const preferencesRef = useRef(preferences);
  const [game, setGame] = useState(() => freshGame(preferences.size));
  const gameRef = useRef(game);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [celebrate, setCelebrate] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const epochRef = useRef(0);
  const [announcement, setAnnouncement] = useState({ id: 0, text: '' });
  const lastTick = useRef(performance.now());
  const visible = useRef(!document.hidden);

  function commit(next: GameState) {
    const previous = gameRef.current;
    if (next === previous) return;
    gameRef.current = next;
    // Keep precise time in memory; render only when displayed information changes.
    if (next.board !== previous.board || next.matched !== previous.matched ||
        next.selection.kind !== previous.selection.kind || next.moves !== previous.moves ||
        Math.floor(next.elapsedMs / 1000) !== Math.floor(previous.elapsedMs / 1000)) setGame(next);
  }
  function synchronize() {
    const now = performance.now();
    const delta = Math.max(0, now - lastTick.current);
    lastTick.current = now;
    if (visible.current && !pausedRef.current) commit(advanceGame(gameRef.current, delta));
    return gameRef.current;
  }
  function announce(text: string) {
    setAnnouncement(previous => ({ id: previous.id + 1, text }));
  }
  function saveSize(size: Size) {
    const next = { ...preferencesRef.current, size };
    preferencesRef.current = next;
    setPreferences(next);
    writePreferences(storage, next);
  }
  function recordBest(state: GameState) {
    const current = preferencesRef.current;
    const best = current.best[state.board.size];
    if (best !== undefined && best <= state.moves) return;
    const next = { ...current, best: { ...current.best, [state.board.size]: state.moves } };
    preferencesRef.current = next;
    setPreferences(next);
    writePreferences(storage, next);
  }
  function activate(index: number) {
    const before = synchronize();
    if (pausedRef.current || !visible.current) return;
    const next = activateCard(before, index);
    commit(next);
    if (before.selection.kind !== 'one' || next === before) return;
    if (next.selection.kind === 'mismatch') announce('No match. Cards close after a short pause.');
    else if (isWon(next)) {
      announce(`Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`);
      setCelebrate(true);
      recordBest(next);
    } else {
      const pairs = next.matched.length / 2;
      announce(`Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`);
    }
  }
  function replace(next: GameState, imported = false) {
    epochRef.current += 1;
    setEpoch(epochRef.current);
    lastTick.current = performance.now();
    visible.current = !document.hidden;
    pausedRef.current = imported && !isWon(next);
    setPaused(pausedRef.current);
    setCelebrate(false);
    commit(next);
    saveSize(next.board.size);
    if (imported) announce(isWon(next) ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
    else setAnnouncement(previous => ({ id: previous.id + 1, text: '' }));
  }
  function newGame(size = gameRef.current.board.size) {
    replace(freshGame(size, gameRef.current.board.code));
  }
  function restart() {
    const next = createGame(gameRef.current.board.code);
    if (next) replace(next);
  }
  function resume() {
    lastTick.current = performance.now();
    pausedRef.current = false;
    setPaused(false);
  }
  function exportSnapshot() { return encodeSnapshot(synchronize()); }

  useEffect(() => {
    const generation = epochRef.current;
    let cancelled = false;
    let timer: number;
    const tick = () => {
      if (cancelled || generation !== epochRef.current) return;
      const current = synchronize();
      const remaining = current.selection.kind === 'mismatch' ? current.selection.remainingMs : 32;
      timer = window.setTimeout(tick, Math.min(32, remaining));
    };
    const visibility = () => {
      if (generation !== epochRef.current) return;
      synchronize();
      visible.current = !document.hidden;
    };
    timer = window.setTimeout(tick, 32);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
    // Callbacks read current game and pause refs; each deal invalidates its timer.
  }, [epoch]);

  return { game, paused, celebrate, epoch, announcement, best: preferences.best[game.board.size],
    activate, newGame, restart, replace, resume, exportSnapshot, announce };
}
