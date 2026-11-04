import { useEffect, useState } from 'react';
import { browserClock, freshSeed } from './browser.ts';
import { createSession } from './controller.ts';
import { readPreferences, writePreferences } from './storage.ts';

export function useGameSession() {
  const [session] = useState(() => createSession({
    ...browserClock, seed: freshSeed, save: writePreferences,
  }, readPreferences()));
  const [view, setView] = useState(session.getView);
  useEffect(() => session.connect(setView), [session]);
  return {
    ...view,
    activate: session.activate,
    newGame: session.newGame,
    restart: session.restart,
    chooseSize: session.chooseSize,
    loadBoard: session.loadBoard,
    loadSnapshot: session.loadSnapshot,
    exportSnapshot: session.exportSnapshot,
    resume: session.resume,
  };
}
