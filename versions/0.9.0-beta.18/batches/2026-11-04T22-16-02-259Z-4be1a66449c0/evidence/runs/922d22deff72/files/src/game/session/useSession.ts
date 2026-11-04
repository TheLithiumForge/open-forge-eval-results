import { useCallback, useEffect, useRef, useState } from 'react';
import { activateCard, advanceGame, createGame, formatTime, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import type { Size } from '../deck.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { readBests, readSize, saveBests, saveSize } from './storage.ts';
function fresh(size: Size): GameState { const seed = Math.floor(Math.random() * 2147483646) + 1; const game = createGame(`np1-${size}-${seed}`); if (!game) throw new Error('Invalid generated board'); return game; }
export function useSession() {
  const [game, setGame] = useState(() => fresh(readSize()));
  const current = useRef(game), pausedRef = useRef(false), last = useRef(performance.now());
  const [paused, setPaused] = useState(false), [generation, setGeneration] = useState(0);
  const [bests, setBests] = useState(readBests), [announcement, setAnnouncement] = useState('');
  const [status, setStatus] = useState(''), [celebrate, setCelebrate] = useState(false);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null), queue = useRef<string[]>([]);
  const announce = useCallback((message: string) => {
    queue.current.push(message);
    if (announceTimer.current) return;
    const deliver = () => {
      const next = queue.current.shift();
      if (next === undefined) { announceTimer.current = null; return; }
      setAnnouncement('');
      announceTimer.current = setTimeout(() => { setAnnouncement(next); announceTimer.current = setTimeout(deliver, 100); }, 30);
    };
    deliver();
  }, []);
  const update = useCallback((next: GameState) => { current.current = next; setGame(next); }, []);
  const sync = useCallback(() => {
    const now = performance.now(), delta = Math.max(0, now - last.current); last.current = now;
    if (!document.hidden && !pausedRef.current) { const next = advanceGame(current.current, delta); if (next !== current.current) update(next); }
    return current.current;
  }, [update]);
  useEffect(() => {
    const timer = setInterval(sync, 50);
    const visibility = () => { if (document.hidden) { const now = performance.now(); if (!pausedRef.current) update(advanceGame(current.current, Math.max(0, now - last.current))); last.current = now; } else last.current = performance.now(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility); if (announceTimer.current) clearTimeout(announceTimer.current); };
  }, [sync, update]);
  const replace = (next: GameState, pause: boolean, message = '') => {
    if (announceTimer.current) clearTimeout(announceTimer.current); announceTimer.current = null; queue.current = []; setAnnouncement('');
    pausedRef.current = pause; setPaused(pause); last.current = performance.now(); update(next); setGeneration(n => n + 1); setCelebrate(false); setStatus(message); if (message) announce(message); saveSize(next.board.size);
  };
  const activate = (index: number) => {
    const before = sync(); if (pausedRef.current) return;
    const next = activateCard(before, index); if (next === before) return;
    update(next);
    if (before.selection.kind === 'one' && next.selection.kind !== 'one') {
      if (next.selection.kind === 'mismatch') announce('No match. Cards close after a short pause.');
      else if (isWon(next)) {
        announce(`Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`); setCelebrate(true);
        setBests(old => { const key = String(next.board.size), best = old[key]; if (best !== undefined && best <= next.moves) return old; const updated = { ...old, [key]: next.moves }; saveBests(updated); return updated; });
      } else { const pairs = next.matched.length / 2; announce(`Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`); }
    }
  };
  const loadBoard = (code: string): boolean => { const next = createGame(code.trim()); if (!next) { setStatus('Invalid board code.'); announce('Invalid board code.'); return false; } replace(next, false); return true; };
  const loadSnapshot = (text: string): boolean => { const next = decodeSnapshot(text); if (!next) { setStatus('Invalid snapshot.'); announce('Invalid snapshot.'); return false; } const won = isWon(next); replace(next, !won, won ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.'); return true; };
  return { game, paused, generation, best: bests[String(game.board.size)], status, announcement, celebrate, activate, loadBoard, loadSnapshot,
    newGame: (size: Size) => replace(fresh(size), false), restart: () => { const next = createGame(current.current.board.code); if (next) replace(next, false); },
    exportSnapshot: () => encodeSnapshot(sync()), resume: () => { pausedRef.current = false; setPaused(false); last.current = performance.now(); } };
}
