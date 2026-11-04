import { useCallback, useEffect, useRef, useState } from 'react';
import type { Size } from '../deck.ts';
import { activateCard, advanceGame, createGame, formatTime, isWon } from '../game.ts';
import type { Game } from '../game.ts';
import { readBests, readSize, saveBests, saveSize } from './storage.ts';
function fresh(size: Size): Game {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  const seed = ((random[0] ?? 0) % 2147483646) + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Could not create a game');
  return game;
}
export function useSession() {
  const [game, setGame] = useState(() => fresh(readSize()));
  const [paused, setPaused] = useState(false);
  const [bests, setBests] = useState(readBests);
  const [announcement, setAnnouncement] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [deal, setDeal] = useState(0);
  const ref = useRef(game), pauseRef = useRef(false), time = useRef(performance.now());
  const hidden = useRef(document.hidden), announceTimer = useRef<number | undefined>(undefined);
  const messages = useRef<string[]>([]);
  const publish = useCallback((next: Game) => { ref.current = next; setGame(next); }, []);
  const settle = useCallback(() => {
    const now = performance.now(), delta = Math.max(0, now - time.current);
    time.current = now;
    if (!hidden.current && !pauseRef.current) publish(advanceGame(ref.current, delta));
    return ref.current;
  }, [publish]);
  const announce = useCallback((message: string) => {
    messages.current.push(message);
    if (announceTimer.current !== undefined) return;
    const next = () => {
      const item = messages.current.shift();
      if (item === undefined) { announceTimer.current = undefined; return; }
      setAnnouncement('');
      announceTimer.current = window.setTimeout(() => {
        setAnnouncement(item);
        announceTimer.current = window.setTimeout(next, 100);
      }, 30);
    };
    next();
  }, []);
  useEffect(() => {
    const onVisibility = () => { settle(); hidden.current = document.hidden; time.current = performance.now(); };
    document.addEventListener('visibilitychange', onVisibility);
    const id = window.setInterval(settle, 50);
    return () => { window.clearInterval(id); window.clearTimeout(announceTimer.current); document.removeEventListener('visibilitychange', onVisibility); };
  }, [settle]);
  const replace = (next: Game, pause = false) => {
    time.current = performance.now(); pauseRef.current = pause; setPaused(pause);
    publish(next); saveSize(next.board.size); setDeal(n => n + 1); setCelebrate(false); setAnnouncement('');
    window.clearTimeout(announceTimer.current); announceTimer.current = undefined; messages.current = [];
  };
  const activate = (index: number) => {
    settle(); if (pauseRef.current) return;
    const previous = ref.current, next = activateCard(previous, index);
    if (next === previous) return;
    publish(next);
    if (previous.selection.kind === 'one' && next.selection.kind !== 'one') {
      if (next.selection.kind === 'mismatch') announce('No match. Cards close after a short pause.');
      else if (isWon(next)) {
        announce(`Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`);
        setCelebrate(true);
        setBests(old => {
          const best = old[next.board.size];
          if (best !== undefined && best <= next.moves) return old;
          const updated = { ...old, [next.board.size]: next.moves }; saveBests(updated); return updated;
        });
      } else {
        const pairs = next.matched.length / 2;
        announce(`Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`);
      }
    }
  };
  const resume = () => { time.current = performance.now(); pauseRef.current = false; setPaused(false); };
  return { game, paused, bests, announcement, celebrate, deal, activate, replace, resume, settle, announce, fresh };
}
