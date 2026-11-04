import { useCallback, useRef, useState } from 'react';
import type { Size } from '../deal.ts';
import { createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { activateCard } from '../turn.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { turnAnnouncement } from './announcements.ts';
import { freshDeal } from './freshDeal.ts';
import { readPreferences, savePreferences } from './storage.ts';
import { useActiveClock } from './useActiveClock.ts';

export function useGameSession() {
  const [preferences, setPreferences] = useState(readPreferences);
  const preferencesRef = useRef(preferences);
  const [game, setGame] = useState(() => freshDeal(preferences.size));
  const [paused, setPaused] = useState(false);
  const current = useRef({ game, paused });
  const [dealId, setDealId] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [announcement, setAnnouncement] = useState({ id: 0, text: '' });
  const [loadStatus, setLoadStatus] = useState('');
  const commit = useCallback((next: GameState) => {
    current.current.game = next;
    setGame(next);
  }, []);
  const read = useCallback(() => current.current, []);
  const clock = useActiveClock(read, commit);

  function announce(text: string) {
    setAnnouncement(previous => ({ id: previous.id + 1, text }));
  }
  function saveSize(size: Size) {
    const next = { ...preferencesRef.current, size };
    preferencesRef.current = next;
    setPreferences(next);
    savePreferences(next);
  }
  function replace(next: GameState, pause: boolean) {
    current.current = { game: next, paused: pause };
    setGame(next);
    setPaused(pause);
    setCelebrate(false);
    setDealId(id => id + 1);
    setLoadStatus('');
    setAnnouncement(previous => ({ id: previous.id + 1, text: '' }));
    saveSize(next.board.size);
    clock.reset();
  }
  function activate(index: number) {
    clock.sync();
    if (current.current.paused) return;
    const before = current.current.game;
    const after = activateCard(before, index);
    commit(after);
    const message = turnAnnouncement(before, after);
    if (message) announce(message);
    if (!isWon(before) && isWon(after)) {
      setCelebrate(true);
      const prefs = preferencesRef.current;
      const best = prefs.bests[after.board.size];
      if (best === undefined || after.moves < best) {
        const next = { ...prefs, bests: { ...prefs.bests, [after.board.size]: after.moves } };
        preferencesRef.current = next;
        setPreferences(next);
        savePreferences(next);
      }
    }
    clock.wake();
  }
  function loadBoard(draft: string): boolean {
    const next = createGame(draft.trim());
    if (!next) {
      setLoadStatus('Invalid board code.');
      announce('Invalid board code.');
      return false;
    }
    replace(next, false);
    return true;
  }
  function loadSnapshot(draft: string): boolean {
    const next = decodeSnapshot(draft);
    if (!next) {
      setLoadStatus('Invalid snapshot.');
      announce('Invalid snapshot.');
      return false;
    }
    const complete = isWon(next);
    replace(next, !complete);
    const message = complete ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.';
    setLoadStatus(message);
    announce(message);
    return true;
  }
  function exportSnapshot(): string {
    clock.sync();
    return encodeSnapshot(current.current.game);
  }
  function resume() {
    current.current.paused = false;
    setPaused(false);
    clock.reset();
  }
  function newGame(size: Size = current.current.game.board.size) {
    replace(freshDeal(size, current.current.game.board.code), false);
  }
  function restart() {
    const next = createGame(current.current.game.board.code);
    if (next) replace(next, false);
  }
  return { game, paused, dealId, celebrate, announcement, loadStatus,
    best: preferences.bests[game.board.size], activate, newGame, restart,
    loadBoard, loadSnapshot, exportSnapshot, resume };
}
