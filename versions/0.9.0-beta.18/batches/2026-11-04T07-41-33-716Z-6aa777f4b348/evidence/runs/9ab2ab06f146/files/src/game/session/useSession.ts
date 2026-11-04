import { useCallback, useEffect, useRef, useState } from 'react';
import type { Size } from '../board.ts';
import { activateCard } from '../activate.ts';
import { advanceGame } from '../advance.ts';
import { createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { freshGame } from './deal.ts';
import { turnAnnouncement } from './announcements.ts';
import { readPreferences, writePreferences } from './storage.ts';
import type { Preferences } from './storage.ts';

type Session = Readonly<{
  game: GameState; preferences: Preferences; paused: boolean; generation: number;
  celebrate: boolean; announcement: { id: number; text: string }; loadStatus: string;
}>;

function initialSession(): Session {
  const preferences = readPreferences();
  return { game: freshGame(preferences.size), preferences, paused: false, generation: 0,
    celebrate: false, announcement: { id: 0, text: '' }, loadStatus: '' };
}

export function useSession() {
  const [model, setModel] = useState(initialSession);
  const current = useRef(model);
  const baseline = useRef(performance.now());
  const visible = useRef(!document.hidden);
  const publish = useCallback((next: Session) => {
    current.current = next;
    setModel(next);
  }, []);
  const sample = useCallback(() => {
    const now = performance.now();
    const milliseconds = Math.max(0, Math.floor(now - baseline.current));
    baseline.current += milliseconds;
    const session = current.current;
    if (!visible.current || session.paused) return session;
    const game = advanceGame(session.game, milliseconds);
    if (game !== session.game) publish({ ...session, game });
    return current.current;
  }, [publish]);

  useEffect(() => {
    const generation = model.generation;
    let cancelled = false;
    let frame = 0;
    const tick = () => {
      if (cancelled || current.current.generation !== generation) return;
      sample();
      frame = requestAnimationFrame(tick);
    };
    const visibility = () => {
      if (current.current.generation !== generation) return;
      sample(); // Settle shown time before freezing, discard time before showing.
      visible.current = !document.hidden;
      baseline.current = performance.now();
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [model.generation, sample]);

  function replace(game: GameState, paused = false, status = '') {
    const session = current.current;
    const preferences = { ...session.preferences, size: game.board.size };
    writePreferences(preferences);
    baseline.current = performance.now();
    visible.current = !document.hidden;
    publish({ ...session, game, preferences, paused, generation: session.generation + 1,
      celebrate: false, loadStatus: status, announcement: {
        id: session.announcement.id + 1, text: status,
      } });
  }

  const activate = useCallback((index: number) => {
    const session = sample();
    if (session.paused || !visible.current) return;
    const game = activateCard(session.game, index);
    if (game === session.game) return;
    if (!session.game.started) baseline.current = performance.now();
    const text = turnAnnouncement(session.game, game);
    let preferences = session.preferences;
    const celebrate = isWon(game);
    if (celebrate) {
      const best = preferences.best[game.board.size];
      if (best === undefined || game.moves < best) {
        preferences = { ...preferences, best: { ...preferences.best, [game.board.size]: game.moves } };
        writePreferences(preferences);
      }
    }
    publish({ ...session, game, preferences, celebrate,
      announcement: text ? { id: session.announcement.id + 1, text } : session.announcement });
  }, [publish, sample]);

  function invalid(status: string) {
    const session = sample();
    publish({ ...session, loadStatus: status,
      announcement: { id: session.announcement.id + 1, text: status } });
  }

  function loadBoard(draft: string): boolean {
    const game = createGame(draft.trim());
    if (!game) { invalid('Invalid board code.'); return false; }
    replace(game, false, 'Loaded board.');
    return true;
  }

  function loadSnapshot(draft: string): boolean {
    const game = decodeSnapshot(draft);
    if (!game) { invalid('Invalid snapshot.'); return false; }
    const completed = isWon(game);
    replace(game, !completed, completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
    return true;
  }

  function resume() {
    const session = current.current;
    baseline.current = performance.now();
    publish({ ...session, paused: false });
  }

  function newGame(size: Size = current.current.game.board.size) {
    replace(freshGame(size, current.current.game.board.code));
  }

  function restart() {
    const game = createGame(current.current.game.board.code);
    if (game) replace(game);
  }

  return { ...model, activate, newGame, restart, loadBoard, loadSnapshot, resume,
    exportSnapshot: () => encodeSnapshot(sample().game) };
}
