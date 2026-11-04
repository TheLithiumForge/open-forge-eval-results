import { useCallback, useEffect, useRef, useState } from 'react';
import type { GridSize } from '../deck.ts';
import { activateCard, advanceGame, createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { turnAnnouncement } from './announcements.ts';
import { freshGame } from './freshGame.ts';
import { browserStorage } from './browserStorage.ts';
import { readPreferences, savePreferences } from './storage.ts';
import type { Preferences } from './storage.ts';

type Session = Readonly<{
  game: GameState; preferences: Preferences; paused: boolean; celebrate: boolean;
  revision: number; notice: string; announcement: string; announcementId: number;
}>;

function initialSession(): Session {
  const preferences = readPreferences(browserStorage());
  return { game: freshGame(preferences.size), preferences, paused: false, celebrate: false,
    revision: 0, notice: '', announcement: '', announcementId: 0 };
}

export function useSession() {
  const [session, setSession] = useState(initialSession);
  const current = useRef(session);
  const timeline = useRef({ last: performance.now(), visible: !document.hidden });
  const generation = useRef(0);
  const publish = useCallback((next: Session) => { current.current = next; setSession(next); }, []);
  const sync = useCallback((): Session => {
    const now = performance.now();
    const before = current.current;
    const delta = Math.max(0, now - timeline.current.last);
    timeline.current.last = now;
    const game = timeline.current.visible && !before.paused ? advanceGame(before.game, delta) : before.game;
    const next = game === before.game ? before : { ...before, game };
    if (next !== before) publish(next);
    return next;
  }, [publish]);

  useEffect(() => {
    const token = ++generation.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      if (generation.current !== token) return;
      const value = current.current;
      if (!timeline.current.visible || value.paused || !value.game.started || isWon(value.game)) return;
      const delay = value.game.selection.kind === 'mismatch' ? Math.min(100, value.game.selection.remainingMs) : 100;
      timer = setTimeout(() => { if (generation.current === token) { sync(); schedule(); } }, delay);
    }
    function visibility() {
      sync();
      timeline.current.visible = !document.hidden;
      if (timer !== undefined) clearTimeout(timer);
      schedule();
    }
    timeline.current.visible = !document.hidden;
    document.addEventListener('visibilitychange', visibility);
    schedule();
    return () => {
      generation.current += 1;
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [session.revision, session.paused, session.game.started, isWon(session.game), sync]);

  function announce(text: string, notice = current.current.notice): void {
    const before = current.current;
    publish({ ...before, notice, announcement: text, announcementId: before.announcementId + 1 });
  }
  function replace(game: GameState, imported = false): void {
    generation.current += 1;
    timeline.current.last = performance.now();
    const before = current.current;
    const preferences = { ...before.preferences, size: game.board.size };
    savePreferences(browserStorage(), preferences);
    publish({ ...before, game, preferences, paused: imported && !isWon(game), celebrate: false,
      revision: before.revision + 1, notice: '', announcement: '', announcementId: before.announcementId + 1 });
  }
  function activate(index: number): void {
    const before = sync();
    if (before.paused || document.hidden) return;
    const game = activateCard(before.game, index);
    if (game === before.game) return;
    let preferences = before.preferences;
    const won = isWon(game);
    const best = preferences.best[game.board.size];
    if (won && (best === undefined || game.moves < best)) {
      preferences = { ...preferences, best: { ...preferences.best, [game.board.size]: game.moves } };
      savePreferences(browserStorage(), preferences);
    }
    const announcement = turnAnnouncement(before.game, game);
    publish({ ...before, game, preferences, celebrate: won,
      announcement: announcement ?? before.announcement,
      announcementId: before.announcementId + (announcement === null ? 0 : 1) });
  }
  function loadBoard(text: string): boolean {
    const game = createGame(text.trim());
    if (!game) { announce('Invalid board code.', 'Invalid board code.'); return false; }
    replace(game);
    announce('Loaded board.', 'Loaded board.');
    return true;
  }
  function loadSnapshot(text: string): boolean {
    const game = decodeSnapshot(text);
    if (!game) { announce('Invalid snapshot.', 'Invalid snapshot.'); return false; }
    replace(game, true);
    const status = isWon(game) ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.';
    announce(status, status);
    return true;
  }
  function resume(): void {
    timeline.current.last = performance.now();
    publish({ ...current.current, paused: false });
  }
  function newGame(size: GridSize = current.current.game.board.size): void {
    replace(freshGame(size, current.current.game.board.seed));
  }
  function restart(): void {
    const game = createGame(current.current.game.board.code);
    if (game) replace(game);
  }
  return { ...session, activate, newGame, restart, loadBoard, loadSnapshot, resume,
    exportSnapshot: () => encodeSnapshot(sync().game) };
}
