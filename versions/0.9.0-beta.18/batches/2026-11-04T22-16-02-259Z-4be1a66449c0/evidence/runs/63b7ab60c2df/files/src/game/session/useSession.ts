import { useCallback, useEffect, useRef, useState } from 'react';
import { activateCard, advanceGame, createGame, formatTime, isWon } from '../game.ts';
import type { Game } from '../game.ts';
import type { Size } from '../deck.ts';
import { readBests, readSize, saveBests, saveSize } from './storage.ts';
function fresh(size: Size): Game { const game = createGame(`np1-${size}-${Math.floor(Math.random() * 2147483646) + 1}`); if (!game) throw new Error('Could not create game'); return game; }
export function useSession() {
  const [game, setGame] = useState(() => fresh(readSize())); const current = useRef(game);
  const [bests, setBests] = useState(readBests); const [paused, setPaused] = useState(false); const pausedRef = useRef(false);
  const [generation, setGeneration] = useState(0); const [celebrate, setCelebrate] = useState(false);
  const [announcement, setAnnouncement] = useState({ text: '', id: 0 }); const last = useRef(performance.now()); const visible = useRef(!document.hidden);
  const commit = useCallback((next: Game) => { current.current = next; setGame(next); }, []);
  const sync = useCallback(() => {
    const now = performance.now(); const delta = Math.max(0, now - last.current); last.current = now;
    if (visible.current && !pausedRef.current) { const next = advanceGame(current.current, delta); if (next !== current.current) commit(next); }
    return current.current;
  }, [commit]);
  useEffect(() => {
    const interval = window.setInterval(sync, 50);
    const onVisibility = () => { sync(); visible.current = !document.hidden; last.current = performance.now(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisibility); };
  }, [sync]);
  const announce = useCallback((text: string) => setAnnouncement(previous => ({ text, id: previous.id + 1 })), []);
  const replace = useCallback((next: Game, shouldPause = false) => {
    sync(); pausedRef.current = shouldPause; setPaused(shouldPause); last.current = performance.now(); commit(next); saveSize(next.size); setGeneration(value => value + 1); setCelebrate(false);
  }, [commit, sync]);
  const activate = useCallback((index: number) => {
    const before = sync(); if (pausedRef.current) return;
    const next = activateCard(before, index); if (next === before) return; commit(next);
    if (before.selection.kind === 'one' && next.selection.kind !== 'one') {
      if (next.selection.kind === 'mismatch') announce('No match. Cards close after a short pause.');
      else if (isWon(next)) {
        announce(`Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`); setCelebrate(true);
        setBests(previous => { const best = previous[next.size]; if (best !== undefined && best <= next.moves) return previous; const updated = { ...previous, [next.size]: next.moves }; saveBests(updated); return updated; });
      } else { const pairs = next.matched.length / 2; announce(`Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`); }
    }
  }, [announce, commit, sync]);
  const resume = useCallback(() => { pausedRef.current = false; setPaused(false); last.current = performance.now(); }, []);
  return { game, bests, paused, generation, celebrate, announcement, announce, activate, replace, resume, sync, fresh };
}
