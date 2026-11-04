import { useCallback, useEffect, useRef, useState } from 'react';
import { activateCard, advanceGame, createGame, formatTime, isWon } from '../game';
import type { Game } from '../game';
import type { Size } from '../deck';
import { readBests, readSize, saveBests, saveSize } from './storage';
function fresh(size: Size): Game {
  const values = new Uint32Array(1);
  try { crypto.getRandomValues(values); } catch { values[0] = Math.floor(Math.random() * 2147483646); }
  const seed = ((values[0] ?? 0) % 2147483646) + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Could not create game');
  return game;
}
export function useSession() {
  const [game, setGame] = useState(() => fresh(readSize()));
  const current = useRef(game), last = useRef(performance.now()), pausedRef = useRef(false);
  const [paused, setPaused] = useState(false), [deal, setDeal] = useState(0), [celebrate, setCelebrate] = useState(false);
  const [bests, setBests] = useState(readBests);
  const [announcement, setAnnouncement] = useState('');
  const queue = useRef<string[]>([]), announcing = useRef(false);
  const frame = useRef<number | null>(null), announcementTimer = useRef<number | null>(null);
  const announce = useCallback((message: string) => {
    queue.current.push(message);
    if (announcing.current) return;
    announcing.current = true;
    const next = () => {
      const item = queue.current.shift();
      if (item === undefined) { announcing.current = false; return; }
      setAnnouncement('');
      frame.current = requestAnimationFrame(() => {
        setAnnouncement(item);
        announcementTimer.current = window.setTimeout(next, 200);
      });
    };
    next();
  }, []);
  const sync = useCallback(() => {
    const now = performance.now(), delta = Math.max(0, now - last.current);
    last.current = now;
    if (!pausedRef.current && document.visibilityState !== 'hidden') current.current = advanceGame(current.current, delta);
    return current.current;
  }, []);
  useEffect(() => {
    const interval = window.setInterval(() => { const next = sync(); setGame(next); }, 50);
    const visibility = () => { if (document.visibilityState === 'hidden') { const now = performance.now(); if (!pausedRef.current) current.current = advanceGame(current.current, Math.max(0, now - last.current)); last.current = now; setGame(current.current); } else last.current = performance.now(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', visibility); if (frame.current !== null) cancelAnimationFrame(frame.current); if (announcementTimer.current !== null) clearTimeout(announcementTimer.current); };
  }, [sync]);
  const replace = useCallback((next: Game, pause = false) => {
    current.current = next; last.current = performance.now(); setCelebrate(false); pausedRef.current = pause; setPaused(pause); setGame(next); setDeal(n => n + 1); saveSize(next.board.size);
  }, []);
  const activate = useCallback((index: number) => {
    const before = sync();
    if (pausedRef.current) return;
    const next = activateCard(before, index); current.current = next; setGame(next);
    if (next.moves !== before.moves || (before.selection.kind === 'one' && next.selection.kind !== 'one' && next !== before)) {
      if (next.selection.kind === 'mismatch') announce('No match. Cards close after a short pause.');
      else if (isWon(next)) {
        setCelebrate(true);
        announce(`Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`);
        setBests(old => { const best = old[next.board.size]; if (best !== undefined && best <= next.moves) return old; const updated = { ...old, [next.board.size]: next.moves }; saveBests(updated); return updated; });
      } else { const count = next.matched.length / 2; announce(`Pair found. ${count} ${count === 1 ? 'pair' : 'pairs'} matched.`); }
    }
  }, [announce, sync]);
  const resume = () => { last.current = performance.now(); pausedRef.current = false; setPaused(false); };
  return { game, paused, deal, celebrate, bests, announcement, announce, sync, activate, replace, resume, newGame: (size: Size) => replace(fresh(size)) };
}
