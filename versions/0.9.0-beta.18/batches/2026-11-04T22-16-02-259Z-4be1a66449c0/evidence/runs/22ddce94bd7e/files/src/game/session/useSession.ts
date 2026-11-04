import { useCallback, useEffect, useRef, useState } from 'react';
import type { Size } from '../deck.ts';
import { activateCard, advanceGame, createGame, formatTime, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { loadBests, loadSize, saveBests, saveSize } from './storage.ts';
function fresh(size: Size): GameState {
  const seed = Math.floor(Math.random() * 2147483646) + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Invalid generated board');
  return game;
}
export function useSession() {
  const [game, setGame] = useState(() => fresh(loadSize()));
  const current = useRef(game), last = useRef(performance.now());
  const pausedRef = useRef(false), hidden = useRef(document.hidden);
  const [paused, setPaused] = useState(false), [generation, setGeneration] = useState(0);
  const [bests, setBests] = useState(loadBests);
  const [announcement, setAnnouncement] = useState({ text: '', serial: 0 });
  const [status, setStatus] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const announce = useCallback((text: string) => setAnnouncement(previous => ({ text, serial: previous.serial + 1 })), []);
  const publish = useCallback((next: GameState) => { current.current = next; setGame(next); }, []);
  const sync = useCallback(() => {
    const now = performance.now();
    if (!hidden.current && !pausedRef.current) publish(advanceGame(current.current, Math.max(0, now - last.current)));
    last.current = now;
    return current.current;
  }, [publish]);
  useEffect(() => {
    const timer = window.setInterval(sync, 50);
    const visibility = () => { sync(); hidden.current = document.hidden; last.current = performance.now(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [sync]);
  const replace = useCallback((next: GameState, pause: boolean, loaded: boolean) => {
    current.current = next; setGame(next); pausedRef.current = pause; setPaused(pause);
    last.current = performance.now(); setGeneration(n => n + 1); setCelebrate(false);
    saveSize(next.size);
    const message = loaded ? (pause ? 'Loaded snapshot. Select Resume to continue.' : 'Loaded completed snapshot.') : '';
    setStatus(message); if (message) announce(message);
  }, [announce]);
  const newGame = useCallback((size: Size) => replace(fresh(size), false, false), [replace]);
  const restart = useCallback(() => { const next = createGame(current.current.boardCode); if (next) replace(next, false, false); }, [replace]);
  const loadBoard = useCallback((draft: string): boolean => {
    const next = createGame(draft.trim());
    if (!next) { setStatus('Invalid board code.'); announce('Invalid board code.'); return false; }
    replace(next, false, false); return true;
  }, [announce, replace]);
  const loadSnapshot = useCallback((draft: string): boolean => {
    const next = decodeSnapshot(draft);
    if (!next) { setStatus('Invalid snapshot.'); announce('Invalid snapshot.'); return false; }
    replace(next, !isWon(next), true); return true;
  }, [announce, replace]);
  const resume = useCallback(() => { pausedRef.current = false; setPaused(false); last.current = performance.now(); }, []);
  const activate = useCallback((index: number) => {
    if (pausedRef.current || hidden.current) return;
    const before = sync(), next = activateCard(before, index);
    if (next === before) return;
    publish(next);
    if (next.moves !== before.moves || (before.selection.kind === 'one' && next.selection.kind !== 'one')) {
      if (next.selection.kind === 'mismatch') announce('No match. Cards close after a short pause.');
      else {
        const pairs = next.matched.length / 2;
        if (isWon(next)) {
          announce(`Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`); setCelebrate(true);
          setBests(previous => {
            const old = previous[next.size];
            if (old !== undefined && old <= next.moves) return previous;
            const updated = { ...previous, [next.size]: next.moves }; saveBests(updated); return updated;
          });
        } else announce(`Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`);
      }
    }
  }, [announce, publish, sync]);
  const exportSnapshot = useCallback(() => encodeSnapshot(sync()), [sync]);
  return { game, paused, generation, best: bests[game.size], announcement, status, celebrate, newGame, restart, loadBoard, loadSnapshot, resume, activate, exportSnapshot };
}
