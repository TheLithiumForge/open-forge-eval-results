import { useCallback, useEffect, useRef, useState } from 'react';
import { activateCard, advanceGame, createGame, formatTime, isWon } from '../game.ts';
import type { Game } from '../game.ts';
import type { Size } from '../deck.ts';
import { readBests, readSize, saveBests, saveSize } from './storage.ts';
function fresh(size: Size): Game { return createGame(`np1-${size}-${Math.floor(Math.random() * 2147483646) + 1}`); }
export function useSession() {
  const [game, setGame] = useState(() => fresh(readSize()));
  const current = useRef(game), pausedRef = useRef(false), last = useRef(performance.now());
  const [paused, setPaused] = useState(false), [deal, setDeal] = useState(0), [celebrate, setCelebrate] = useState(false);
  const [bests, setBests] = useState(readBests);
  const [announcement, setAnnouncement] = useState({ text: '', id: 0 });
  const announce = useCallback((text: string) => setAnnouncement(a => ({ text, id: a.id + 1 })), []);
  const sync = useCallback(() => {
    const now = performance.now(), delta = Math.floor(now - last.current);
    if (delta > 0) { last.current += delta; if (!document.hidden && !pausedRef.current) current.current = advanceGame(current.current, delta); }
    return current.current;
  }, []);
  useEffect(() => {
    const tick = () => { const before = current.current, after = sync(); if (before !== after) setGame(after); };
    const onVisibility = () => { const now = performance.now(); if (document.hidden && !pausedRef.current) { current.current = advanceGame(current.current, Math.max(0, Math.floor(now - last.current))); setGame(current.current); } last.current = now; };
    const timer = window.setInterval(tick, 50);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [sync]);
  const replace = useCallback((next: Game, shouldPause = false) => {
    current.current = next; last.current = performance.now(); pausedRef.current = shouldPause;
    setGame(next); setPaused(shouldPause); setDeal(n => n + 1); setCelebrate(false); saveSize(next.size);
  }, []);
  const activate = useCallback((index: number) => {
    const before = sync();
    if (pausedRef.current) return;
    const next = activateCard(before, index); current.current = next; setGame(next);
    if (next.selection.kind === 'mismatch' && before.selection.kind === 'one') announce('No match. Cards close after a short pause.');
    else if (next.matched.length > before.matched.length) {
      const pairs = next.matched.length / 2;
      if (isWon(next)) {
        announce(`Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`); setCelebrate(true);
        setBests(old => { const best = old[next.size]; if (best !== undefined && best <= next.moves) return old; const updated = { ...old, [next.size]: next.moves }; saveBests(updated); return updated; });
      } else announce(`Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`);
    }
  }, [announce, sync]);
  const resume = useCallback(() => { pausedRef.current = false; setPaused(false); last.current = performance.now(); }, []);
  return { game, paused, deal, celebrate, best: bests[game.size], announcement, announce, activate, replace, resume, sync, fresh };
}
