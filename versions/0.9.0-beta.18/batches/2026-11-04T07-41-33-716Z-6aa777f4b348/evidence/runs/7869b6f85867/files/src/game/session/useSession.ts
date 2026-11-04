import { useRef, useState } from 'react';
import type { Size } from '../board-code.ts';
import { parseBoardCode } from '../board-code.ts';
import { createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { activateCard, advanceGame } from '../transitions.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { browserStorage, readPreferences, savePreferences } from './storage.ts';
import type { Preferences } from './storage.ts';
import { freshDeal } from './fresh-deal.ts';
import { useActiveClock } from './useActiveClock.ts';
import { turnAnnouncement } from './announcements.ts';
import type { Announcement } from './announcements.ts';

interface Session {
  game: GameState; preferences: Preferences; paused: boolean; revision: number;
  celebrate: boolean; announcement: Announcement; loadStatus: string;
}

function initialSession(): Session {
  const preferences = readPreferences(browserStorage());
  return { game: freshDeal(preferences.size), preferences, paused: false, revision: 0,
    celebrate: false, announcement: { id: 0, text: '' }, loadStatus: '' };
}

export function useSession() {
  const [view, setView] = useState(initialSession);
  const current = useRef(view);
  const publish = (next: Session) => { current.current = next; setView(next); };
  const flush = useActiveClock(delta => {
    const session = current.current;
    const game = advanceGame(session.game, delta);
    if (game !== session.game) publish({ ...session, game });
  }, view.paused, view.revision);

  const announce = (text: string) => {
    const session = current.current;
    publish({ ...session, loadStatus: text,
      announcement: { id: session.announcement.id + 1, text } });
  };
  const replace = (game: GameState, paused = false) => {
    flush();
    const session = current.current;
    const preferences = { ...session.preferences, size: game.board.size };
    savePreferences(browserStorage(), preferences);
    publish({ ...session, game, paused, preferences, revision: session.revision + 1,
      celebrate: false, loadStatus: '', announcement: { id: session.announcement.id + 1, text: '' } });
  };
  const activate = (index: number) => {
    if (current.current.paused) return;
    flush();
    const session = current.current;
    const game = activateCard(session.game, index);
    if (game === session.game) return;
    const text = turnAnnouncement(session.game, game);
    let preferences = session.preferences;
    const won = isWon(game);
    const best = preferences.best[game.board.size];
    if (won && (best === undefined || game.moves < best)) {
      preferences = { ...preferences, best: { ...preferences.best, [game.board.size]: game.moves } };
      savePreferences(browserStorage(), preferences);
    }
    publish({ ...session, game, preferences, celebrate: won,
      announcement: text ? { id: session.announcement.id + 1, text } : session.announcement });
  };
  const loadBoard = (draft: string) => {
    const code = draft.trim();
    if (!parseBoardCode(code)) { announce('Invalid board code.'); return; }
    replace(createGame(code));
  };
  const loadSnapshot = (draft: string) => {
    const game = decodeSnapshot(draft);
    if (!game) { announce('Invalid snapshot.'); return; }
    replace(game, !isWon(game));
    announce(isWon(game) ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
  };
  return { ...view, activate, loadBoard, loadSnapshot,
    newGame: () => replace(freshDeal(current.current.game.board.size, current.current.game.board.code)),
    restart: () => replace(createGame(current.current.game.board.code)),
    changeSize: (size: Size) => {
      if (size !== current.current.game.board.size) replace(freshDeal(size));
    },
    resume: () => publish({ ...current.current, paused: false }),
    exportSnapshot: () => { flush(); return encodeSnapshot(current.current.game); },
  };
}
