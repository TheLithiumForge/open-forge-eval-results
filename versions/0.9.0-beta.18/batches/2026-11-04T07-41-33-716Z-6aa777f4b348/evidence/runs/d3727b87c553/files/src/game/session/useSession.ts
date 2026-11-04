import { useCallback, useRef, useState } from 'react';
import type { Size } from '../boardCode.ts';
import { createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { activateCard, advanceGame } from '../transitions.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { turnAnnouncement } from './announcement.ts';
import { freshGame } from './freshGame.ts';
import { browserStorage, readPreferences, savePreferences } from './storage.ts';
import type { Preferences } from './storage.ts';
import { useActiveClock } from './useActiveClock.ts';

interface Session {
  readonly game: GameState;
  readonly preferences: Preferences;
  readonly paused: boolean;
  readonly generation: number;
  readonly celebrate: boolean;
  readonly status: string;
  readonly announcement: { readonly id: number; readonly text: string };
}
function initialSession(): Session {
  const preferences = readPreferences(browserStorage());
  return { game: freshGame(preferences.size), preferences, paused: false, generation: 0,
    celebrate: false, status: '', announcement: { id: 0, text: '' } };
}

export function useSession() {
  const [session, setSession] = useState(initialSession);
  const current = useRef(session);
  const publish = useCallback((next: Session) => { current.current = next; setSession(next); }, []);
  const advance = useCallback((milliseconds: number) => {
    const before = current.current;
    if (before.paused) return;
    const game = advanceGame(before.game, milliseconds);
    if (game === before.game) return;
    const next = { ...before, game };
    // Keep exact logical time; render only visible clock or selection changes.
    current.current = next;
    if (Math.floor(game.elapsedMs / 1000) !== Math.floor(before.game.elapsedMs / 1000) ||
        game.selection.kind !== before.game.selection.kind) setSession(next);
  }, []);
  const clock = useActiveClock(session.generation, advance);
  const announce = (text: string) => {
    const before = current.current;
    publish({ ...before, status: text, announcement: { id: before.announcement.id + 1, text } });
  };
  const replace = (game: GameState, paused: boolean, status: string) => {
    clock.reset();
    const before = current.current;
    const preferences = { ...before.preferences, size: game.board.size };
    savePreferences(browserStorage(), preferences);
    publish({ ...before, game, preferences, paused, generation: before.generation + 1, celebrate: false, status,
      announcement: { id: before.announcement.id + 1, text: status } });
  };
  const activate = (index: number) => {
    clock.flush();
    const before = current.current;
    if (before.paused) return;
    const game = activateCard(before.game, index);
    if (game === before.game) return;
    const text = turnAnnouncement(before.game, game);
    const won = isWon(game);
    let preferences = before.preferences;
    const best = preferences.bests[game.board.size];
    if (won && (best === undefined || game.moves < best)) {
      preferences = { ...preferences, bests: { ...preferences.bests, [game.board.size]: game.moves } };
      savePreferences(browserStorage(), preferences);
    }
    publish({ ...before, game, preferences, celebrate: won,
      announcement: text ? { id: before.announcement.id + 1, text } : before.announcement });
  };
  const newGame = (size: Size = current.current.game.board.size) => {
    replace(freshGame(size, current.current.game.board.seed), false, '');
  };
  const restart = () => {
    const game = createGame(current.current.game.board.code);
    if (game) replace(game, false, '');
  };
  const loadBoard = (text: string) => {
    const game = createGame(text.trim());
    if (!game) { announce('Invalid board code.'); return; }
    replace(game, false, 'Loaded board.');
  };
  const loadSnapshot = (text: string) => {
    const game = decodeSnapshot(text);
    if (!game) { announce('Invalid snapshot.'); return; }
    const completed = isWon(game);
    replace(game, !completed, completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
  };
  const exportSnapshot = () => { clock.flush(); return encodeSnapshot(current.current.game); };
  const resume = () => {
    clock.flush();
    publish({ ...current.current, paused: false });
  };
  return { ...session, activate, newGame, restart, loadBoard, loadSnapshot, exportSnapshot, resume };
}
