import { useCallback, useEffect, useRef, useState } from 'react';
import type { Size } from '../deal.ts';
import { createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { activateCard, advanceGame } from '../turn.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { browserStorage, readPreferences, writePreferences } from './storage.ts';
import { freshGame } from './seed.ts';
import { createActiveClock } from './clock.ts';
import { turnAnnouncement } from './announcement.ts';

export function useSession() {
  const [preferences, setPreferences] = useState(() => readPreferences(browserStorage()));
  const preferencesRef = useRef(preferences);
  const [state, setState] = useState(() => freshGame(preferences.size));
  const current = useRef(state);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [revision, setRevision] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [status, setStatus] = useState('');
  const [announcement, setAnnouncement] = useState({ id: 0, text: '' });
  const clock = useRef<ReturnType<typeof createActiveClock> | null>(null);
  function publish(next: GameState) {
    const before = current.current;
    current.current = next;
    // Keep exact active time in memory; render only when displayed data changes.
    if (before.board !== next.board || before.matched !== next.matched || before.moves !== next.moves ||
      before.started !== next.started || before.selection.kind !== next.selection.kind ||
      Math.floor(before.elapsedMs / 1000) !== Math.floor(next.elapsedMs / 1000)) setState(next);
  }
  function announce(text: string) {
    setAnnouncement(previous => ({ id: previous.id + 1, text }));
  }
  function save(next: typeof preferences) {
    preferencesRef.current = next;
    setPreferences(next);
    writePreferences(browserStorage(), next);
  }
  function syncRunning() {
    const game = current.current;
    clock.current?.setRunning(!document.hidden && !pausedRef.current && game.started && !isWon(game));
  }
  useEffect(() => {
    const timer = createActiveClock({ now: () => performance.now(),
      request: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id) },
    milliseconds => publish(advanceGame(current.current, milliseconds)));
    clock.current = timer;
    function visibility() {
      timer.setRunning(!document.hidden && !pausedRef.current && current.current.started && !isWon(current.current));
    }
    document.addEventListener('visibilitychange', visibility);
    return () => {
      timer.reset();
      clock.current = null;
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  function replace(next: GameState, pause: boolean) {
    clock.current?.reset();
    pausedRef.current = pause;
    setPaused(pause);
    publish(next);
    setCelebrate(false);
    setStatus('');
    setRevision(value => value + 1);
    save({ ...preferencesRef.current, size: next.board.size });
    syncRunning();
  }
  const activate = useCallback((index: number) => {
    clock.current?.flush();
    if (pausedRef.current || document.hidden) return;
    const before = current.current;
    const next = activateCard(before, index);
    if (next === before) return;
    publish(next);
    const message = turnAnnouncement(before, next);
    if (message) announce(message);
    if (isWon(next)) {
      setCelebrate(true);
      const saved = preferencesRef.current;
      const best = saved.best[next.board.size];
      if (best === undefined || next.moves < best) {
        save({ ...saved, best: { ...saved.best, [next.board.size]: next.moves } });
      }
    }
    syncRunning();
  }, []);
  function loadBoard(text: string) {
    const next = createGame(text.trim());
    if (!next) { setStatus('Invalid board code.'); announce('Invalid board code.'); return; }
    replace(next, false);
  }
  function loadSnapshot(text: string) {
    const next = decodeSnapshot(text);
    if (!next) { setStatus('Invalid snapshot.'); announce('Invalid snapshot.'); return; }
    const completed = isWon(next);
    replace(next, !completed);
    const message = completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.';
    setStatus(message);
    announce(message);
  }
  function resume() {
    pausedRef.current = false;
    setPaused(false);
    setStatus('');
    syncRunning();
  }
  function exportSnapshot() {
    clock.current?.flush();
    return encodeSnapshot(current.current);
  }
  function newGame(size: Size = current.current.board.size) {
    replace(freshGame(size, current.current.board.seed), false);
  }
  function restart() {
    const next = createGame(current.current.board.boardCode);
    if (next) replace(next, false);
  }
  return { state, paused, revision, celebrate, status, announcement,
    best: preferences.best[state.board.size], activate, loadBoard, loadSnapshot,
    resume, exportSnapshot, newGame, restart };
}
