import { useCallback, useEffect, useRef, useState } from 'react';
import { activateCard, advanceGame, createGame, formatTime, isWon } from '../game.ts';
import type { Game } from '../game.ts';
import type { Size } from '../deck.ts';
import { readBests, readSize, saveBests, saveSize } from './storage.ts';
function fresh(size: Size): Game {
  const seed = Math.floor(Math.random() * 2147483646) + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Could not create board');
  return game;
}
export function useSession() {
  const [game, setGame] = useState(() => fresh(readSize()));
  const current = useRef(game);
  const [bests, setBests] = useState(readBests);
  const [paused, setPaused] = useState(false), pauseRef = useRef(false);
  const [generation, setGeneration] = useState(0);
  const [loadedWin, setLoadedWin] = useState(false);
  const [announcement, setAnnouncement] = useState({ text: '', id: 0 });
  const last = useRef(performance.now()), visible = useRef(!document.hidden);
  const announce = useCallback((text: string) => setAnnouncement(old => ({ text, id: old.id + 1 })), []);
  const commit = useCallback((next: Game) => { current.current = next; setGame(next); }, []);
  const sync = useCallback(() => {
    const now = performance.now(), delta = Math.max(0, now - last.current);
    last.current = now;
    if (visible.current && !pauseRef.current) {
      const next = advanceGame(current.current, delta);
      if (next !== current.current) commit(next);
    }
    return current.current;
  }, [commit]);
  useEffect(() => {
    const tick = window.setInterval(sync, 50);
    const visibility = () => { sync(); visible.current = !document.hidden; last.current = performance.now(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(tick); document.removeEventListener('visibilitychange', visibility); };
  }, [sync]);
  const replace = (next: Game, imported = false) => {
    last.current = performance.now(); pauseRef.current = imported && !isWon(next); setPaused(pauseRef.current);
    setLoadedWin(imported && isWon(next)); commit(next); setGeneration(n => n + 1); saveSize(next.board.size);
  };
  const activate = (index: number) => {
    if (pauseRef.current) return;
    const old = sync(), next = activateCard(old, index);
    if (next === old) return;
    commit(next);
    if (old.selection.kind === 'one' && next.selection.kind !== 'one') {
      if (next.selection.kind === 'mismatch') announce('No match. Cards close after a short pause.');
      else if (isWon(next)) {
        announce(`Pair found. All pairs found in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`);
        setBests(previous => {
          const best = previous[next.board.size];
          if (best !== undefined && best <= next.moves) return previous;
          const updated = { ...previous, [next.board.size]: next.moves }; saveBests(updated); return updated;
        });
      } else {
        const count = next.matched.length / 2;
        announce(`Pair found. ${count} ${count === 1 ? 'pair' : 'pairs'} matched.`);
      }
    }
  };
  const resume = () => { last.current = performance.now(); pauseRef.current = false; setPaused(false); };
  return { game, bests, paused, generation, loadedWin, announcement, announce, activate, sync, replace, resume, fresh };
}
