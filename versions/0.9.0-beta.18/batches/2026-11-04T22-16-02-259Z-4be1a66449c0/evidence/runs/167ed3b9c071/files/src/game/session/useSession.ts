import { useCallback, useEffect, useRef, useState } from 'react';
import { activateCard, advanceGame, createGame, formatTime, isWon } from '../core.ts';
import type { Game } from '../core.ts';
import { decodeSnapshot, encodeSnapshot } from '../formats.ts';
import { readBests, readSize, saveBests, saveSize } from './storage.ts';
function fresh(size: number): Game {
  const seed = Math.floor(Math.random() * 2147483646) + 1, game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Invalid size'); return game;
}
export function useSession() {
  const [game, setGame] = useState(() => fresh(readSize()));
  const [paused, setPaused] = useState(false), [bests, setBests] = useState(readBests), [generation, setGeneration] = useState(0);
  const [announcement, setAnnouncement] = useState({ text: '', id: 0 }), [celebrate, setCelebrate] = useState(true);
  const current = useRef(game), pausedRef = useRef(paused), clock = useRef(performance.now());
  const announce = useCallback((text: string) => setAnnouncement(a => ({ text, id: a.id + 1 })), []);
  const sync = useCallback(() => {
    const now = performance.now(), delta = Math.floor(now - clock.current);
    if (delta > 0) { clock.current += delta; if (!pausedRef.current && !document.hidden) current.current = advanceGame(current.current, delta); }
    return current.current;
  }, []);
  const publish = useCallback((next: Game) => { current.current = next; setGame(next); }, []);
  useEffect(() => {
    const tick = () => publish(sync());
    const visibility = () => { if (document.hidden) { const now = performance.now(), delta = Math.floor(now - clock.current); if (!pausedRef.current && delta > 0) current.current = advanceGame(current.current, delta); clock.current = now; publish(current.current); } else clock.current = performance.now(); };
    const timer = window.setInterval(tick, 50); document.addEventListener('visibilitychange', visibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [publish, sync]);
  const replace = (next: Game, pause = false, animated = true) => { clock.current = performance.now(); pausedRef.current = pause; setPaused(pause); setCelebrate(animated); publish(next); saveSize(next.size); setGeneration(n => n + 1); };
  const activate = (index: number) => {
    const before = sync(); if (pausedRef.current) return;
    const next = activateCard(before, index); publish(next);
    if (before.selection.kind === 'one' && next !== before && next.selection.kind !== 'one') {
      if (next.selection.kind === 'mismatch') announce('No match. Cards close after a short pause.');
      else if (next.matched.length > before.matched.length) {
        const pairs = next.matched.length / 2;
        if (isWon(next)) { announce(`Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`); setBests(old => { const best = old[next.size]; if (best !== undefined && best <= next.moves) return old; const updated = { ...old, [next.size]: next.moves }; saveBests(updated); return updated; }); }
        else announce(`Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`);
      }
    }
  };
  const loadBoard = (code: string): boolean => { const next = createGame(code.trim()); if (!next) { announce('Invalid board code.'); return false; } replace(next); announce('Loaded board.'); return true; };
  const loadSnapshot = (text: string): boolean => { const next = decodeSnapshot(text); if (!next) { announce('Invalid snapshot.'); return false; } const won = isWon(next); replace(next, !won, false); announce(won ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.'); return true; };
  const resume = () => { pausedRef.current = false; setPaused(false); clock.current = performance.now(); };
  return { game, paused, best: bests[game.size], generation, announcement, celebrate, activate, newGame: (size = game.size) => replace(fresh(size)), restart: () => { const next = createGame(game.boardCode); if (next) replace(next); }, loadBoard, loadSnapshot, exportSnapshot: () => encodeSnapshot(sync()), resume };
}
