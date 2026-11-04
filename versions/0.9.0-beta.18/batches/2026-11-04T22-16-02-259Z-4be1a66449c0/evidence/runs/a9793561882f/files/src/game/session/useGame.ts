import { useCallback, useEffect, useRef, useState } from 'react';
import { activateCard, advanceGame, createGame, formatTime, isWon } from '../game.ts';
import type { GameState } from '../game.ts';
import type { Size } from '../boardCode.ts';
import { readBests, readSize, saveBests, saveSize } from './storage.ts';
function freshCode(size: Size): string {
  const random = new Uint32Array(1);
  try { crypto.getRandomValues(random); } catch { random[0] = Math.floor(Math.random() * 4294967296); }
  return `np1-${size}-${(random[0] ?? 0) % 2147483646 + 1}`;
}
export function useGame() {
  const [game, setGame] = useState(() => createGame(freshCode(readSize())));
  const current = useRef(game); const last = useRef(performance.now()); const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false); const [generation, setGeneration] = useState(0);
  const [bests, setBests] = useState(readBests); const [announcement, setAnnouncement] = useState('');
  const [pulse, setPulse] = useState(false); const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announcementQueue = useRef<string[]>([]);
  const publish = useCallback((state: GameState) => { current.current = state; setGame(state); }, []);
  const announce = useCallback((message: string) => {
    announcementQueue.current.push(message);
    if (announceTimer.current !== null) return;
    const next = () => {
      const item = announcementQueue.current.shift();
      if (item === undefined) { announceTimer.current = null; return; }
      setAnnouncement('');
      announceTimer.current = setTimeout(() => {
        setAnnouncement(item);
        announceTimer.current = setTimeout(next, 250);
      }, 40);
    };
    next();
  }, []);
  const sync = useCallback(() => {
    const now = performance.now(); const delta = Math.max(0, now - last.current); last.current = now;
    if (!document.hidden && !pausedRef.current) { const next = advanceGame(current.current, delta); if (next !== current.current) publish(next); }
    return current.current;
  }, [publish]);
  useEffect(() => {
    const timer = setInterval(sync, 100);
    const visibility = () => { if (document.hidden) { const now = performance.now(); if (!pausedRef.current) publish(advanceGame(current.current, Math.max(0, now - last.current))); last.current = now; } else last.current = performance.now(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility); if (announceTimer.current !== null) clearTimeout(announceTimer.current); };
  }, [publish, sync]);
  const replace = useCallback((state: GameState, pause: boolean) => {
    if (announceTimer.current !== null) clearTimeout(announceTimer.current);
    announceTimer.current = null; announcementQueue.current = []; setAnnouncement('');
    pausedRef.current = pause; setPaused(pause); last.current = performance.now(); publish(state); setPulse(false); setGeneration(value => value + 1); saveSize(state.size);
  }, [publish]);
  const activate = useCallback((index: number) => {
    const before = sync(); if (pausedRef.current) return;
    const after = activateCard(before, index); if (before === after) return;
    publish(after);
    if (after.moves !== before.moves || (after.selection.kind !== 'one' && before.selection.kind === 'one')) {
      if (after.selection.kind === 'mismatch') announce('No match. Cards close after a short pause.');
      else if (isWon(after)) {
        announce(`Pair found. All pairs found in ${after.moves} moves and ${formatTime(after.elapsedMs)}.`); setPulse(true);
        setBests(existing => { const best = existing[after.size]; if (best !== undefined && best <= after.moves) return existing; const updated = { ...existing, [after.size]: after.moves }; saveBests(updated); return updated; });
      } else { const count = after.matched.length / 2; announce(`Pair found. ${count} ${count === 1 ? 'pair' : 'pairs'} matched.`); }
    }
  }, [announce, publish, sync]);
  const resume = useCallback(() => { pausedRef.current = false; setPaused(false); last.current = performance.now(); }, []);
  return { game, paused, generation, best: bests[game.size], announcement, pulse, activate, sync, replace, resume, announce, newGame: (size: Size) => replace(createGame(freshCode(size)), false), restart: () => replace(createGame(current.current.boardCode), false) };
}
