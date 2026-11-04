import { useEffect, useRef, useState } from 'react';
import type { Size } from '../deal.ts';
import { activateCard, advanceGame, createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { turnAnnouncement } from './announcements.ts';
import { freshGame } from './fresh.ts';
import { readBest, readSize, saveBest, saveSize } from './storage.ts';
import type { BestScores } from './storage.ts';

interface Session {
  game: GameState; paused: boolean; revision: number; celebrate: boolean;
  best: BestScores; announcement: { id: number; text: string };
}
const now = (): number => Math.floor(performance.now());

export function useSession() {
  const [session, setSession] = useState<Session>(() => ({
    game: freshGame(readSize()), paused: false, revision: 0, celebrate: false,
    best: readBest(), announcement: { id: 0, text: '' },
  }));
  const current = useRef(session);
  const last = useRef(now());
  const hidden = useRef(document.hidden);
  function commit(next: Session): void { current.current = next; setSession(next); }
  function syncTime(): void {
    const time = now();
    const delta = time - last.current;
    last.current = time;
    const data = current.current;
    if (hidden.current || data.paused || delta <= 0) return;
    const game = advanceGame(data.game, delta);
    if (game !== data.game) {
      current.current = { ...data, game };
      if (game.selection.kind !== data.game.selection.kind ||
          Math.floor(game.elapsedMs / 1000) !== Math.floor(data.game.elapsedMs / 1000)) {
        setSession(current.current);
      }
    }
  }
  useEffect(() => {
    const revision = session.revision;
    const interval = window.setInterval(() => {
      if (current.current.revision === revision) syncTime();
    }, 16);
    return () => window.clearInterval(interval);
  }, [session.revision]);
  useEffect(() => {
    const visibility = (): void => {
      syncTime();
      hidden.current = document.hidden;
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);

  function announce(text: string): void {
    const data = current.current;
    commit({ ...data, announcement: { id: data.announcement.id + 1, text } });
  }
  function replace(game: GameState, imported = false): void {
    last.current = now();
    const data = current.current;
    saveSize(game.board.size);
    commit({ ...data, game, paused: imported && !isWon(game),
      revision: data.revision + 1, celebrate: false });
  }
  function activate(index: number): void {
    syncTime();
    const data = current.current;
    if (data.paused || hidden.current) return;
    const game = activateCard(data.game, index);
    if (game === data.game) return;
    const result = turnAnnouncement(data.game, game);
    let best = data.best;
    const previous = best[game.board.size];
    if (isWon(game) && (previous === undefined || game.moves < previous)) {
      best = { ...best, [game.board.size]: game.moves };
      saveBest(best);
    }
    commit({ ...data, game, best, celebrate: isWon(game),
      announcement: result === null ? data.announcement : { id: data.announcement.id + 1, text: result } });
  }
  function loadBoard(draft: string): string {
    const game = createGame(draft.trim());
    const status = game ? 'Loaded board.' : 'Invalid board code.';
    if (game) replace(game);
    announce(status);
    return status;
  }
  function loadSnapshot(draft: string): string {
    const game = decodeSnapshot(draft);
    const status = !game ? 'Invalid snapshot.' : isWon(game)
      ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.';
    if (game) replace(game, true);
    announce(status);
    return status;
  }
  function exportSnapshot(): string { syncTime(); return encodeSnapshot(current.current.game); }
  function resume(): void {
    last.current = now();
    commit({ ...current.current, paused: false });
  }
  function newGame(size: Size = current.current.game.board.size): void {
    replace(freshGame(size, current.current.game.board.seed));
  }
  function restart(): void {
    const game = createGame(current.current.game.board.code);
    if (game) replace(game);
  }
  return { ...session, activate, newGame, restart, loadBoard, loadSnapshot, exportSnapshot, resume };
}
