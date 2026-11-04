import { useEffect, useRef, useState } from 'react';
import { activateCard } from '../activateCard.ts';
import { advanceGame } from '../advanceGame.ts';
import type { Size } from '../boardCode.ts';
import { createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { turnAnnouncement } from './announcements.ts';
import { browserStorage, freshCode } from './deals.ts';
import { readPreferences, savePreferences } from './storage.ts';
import type { Preferences } from './storage.ts';

const RENDER_INTERVAL_MS = 50;

type Session = Readonly<{
  game: GameState; preferences: Preferences; dealId: number; paused: boolean;
  celebrate: boolean; announcement: Readonly<{ id: number; text: string }>;
}>;

function initialSession(): Session {
  const preferences = readPreferences(browserStorage());
  return { game: createGame(freshCode(preferences.size)), preferences, dealId: 0,
    paused: false, celebrate: false, announcement: { id: 0, text: '' } };
}

export function useSession() {
  const [session, setSession] = useState(initialSession);
  const current = useRef(session);
  const clock = useRef({ at: performance.now(), visible: !document.hidden });
  function commit(next: Session): void {
    current.current = next;
    setSession(next);
  }
  function synchronize(): Session {
    const now = performance.now();
    const previous = current.current;
    const game = clock.current.visible && !previous.paused
      ? advanceGame(previous.game, now - clock.current.at) : previous.game;
    clock.current.at = now;
    const next = game === previous.game ? previous : { ...previous, game };
    current.current = next;
    return next;
  }
  function announce(previous: Session, text: string): Session {
    return { ...previous, announcement: { id: previous.announcement.id + 1, text } };
  }
  const won = isWon(session.game);
  useEffect(() => {
    if (!session.game.started || session.paused || won) return;
    let active = true;
    const dealId = session.dealId;
    let timer: ReturnType<typeof setTimeout>;
    function tick(): void {
      if (!active || current.current.dealId !== dealId) return;
      commit(synchronize());
      const selection = current.current.game.selection;
      timer = setTimeout(tick, selection.kind === 'mismatch' ? Math.min(RENDER_INTERVAL_MS, selection.remainingMs) : RENDER_INTERVAL_MS);
    }
    timer = setTimeout(tick, RENDER_INTERVAL_MS);
    return () => { active = false; clearTimeout(timer); };
  }, [session.dealId, session.game.started, session.paused, won]);
  useEffect(() => {
    function visibility(): void {
      const next = synchronize();
      clock.current.visible = !document.hidden;
      commit(next);
    }
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);

  function replace(game: GameState, paused: boolean): void {
    const previous = current.current;
    const preferences = { ...previous.preferences, size: game.board.size };
    savePreferences(browserStorage(), preferences);
    clock.current.at = performance.now();
    commit({ ...previous, game, preferences, paused, celebrate: false, dealId: previous.dealId + 1 });
  }
  function activate(index: number): void {
    const previous = synchronize();
    if (previous.paused || !clock.current.visible) { commit(previous); return; }
    const game = activateCard(previous.game, index);
    let next = { ...previous, game };
    if (game !== previous.game && previous.game.selection.kind === 'one') {
      next = announce(next, turnAnnouncement(game));
      if (isWon(game)) {
        const best = previous.preferences.bests[game.board.size];
        const preferences = best === undefined || game.moves < best
          ? { ...previous.preferences, bests: { ...previous.preferences.bests, [game.board.size]: game.moves } }
          : previous.preferences;
        savePreferences(browserStorage(), preferences);
        next = { ...next, preferences, celebrate: true };
      }
    }
    commit(next);
  }
  function newGame(size: Size = current.current.game.board.size): void {
    replace(createGame(freshCode(size, current.current.game.board.code)), false);
  }
  function restart(): void { replace(createGame(current.current.game.board.code), false); }
  function loadBoard(text: string): string {
    let game: GameState;
    try { game = createGame(text.trim()); }
    catch {
      const status = 'Invalid board code.';
      commit(announce(synchronize(), status));
      return status;
    }
    replace(game, false);
    const status = 'Loaded board.';
    commit(announce(current.current, status));
    return status;
  }
  function loadSnapshot(text: string): string {
    const game = decodeSnapshot(text);
    if (!game) {
      const status = 'Invalid snapshot.';
      commit(announce(synchronize(), status));
      return status;
    }
    const completed = isWon(game);
    replace(game, !completed);
    const status = completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.';
    commit(announce(current.current, status));
    return status;
  }
  function exportSnapshot(): string {
    const next = synchronize();
    commit(next);
    return encodeSnapshot(next.game);
  }
  function resume(): void {
    const previous = synchronize();
    commit({ ...previous, paused: false });
  }
  return { ...session, activate, newGame, restart, loadBoard, loadSnapshot, exportSnapshot, resume };
}
