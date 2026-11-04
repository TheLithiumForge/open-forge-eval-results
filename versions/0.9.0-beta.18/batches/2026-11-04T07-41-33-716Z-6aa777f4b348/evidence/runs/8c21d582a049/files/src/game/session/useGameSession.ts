import { useEffect, useState } from 'react';
import { isWon } from '../state.ts';
import { browserStorage, freshSeed } from './browser.ts';
import { GameSession } from './session.ts';
import type { SessionActions } from './sessionTypes.ts';

export function useGameSession() {
  const [session] = useState(() => new GameSession({ now: () => performance.now(), seed: freshSeed,
    storage: browserStorage(), visible: !document.hidden }));
  const [view, setView] = useState(session.getView);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [actions] = useState<SessionActions>(() => ({ activate: session.activate, newGame: session.newGame,
    restart: session.restart, chooseSize: session.chooseSize, loadBoard: session.loadBoard,
    loadSnapshot: session.loadSnapshot, exportSnapshot: session.exportSnapshot, resume: session.resume }));

  useEffect(() => session.connect(setView), [session]);

  useEffect(() => {
    const onVisibility = () => {
      const shown = !document.hidden;
      session.setVisible(shown);
      setVisible(shown);
    };
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      session.setVisible(false);
    };
  }, [session]);

  const won = isWon(view.game);
  const selectionKind = view.game.selection.kind;
  useEffect(() => {
    if (!visible || view.paused || !view.game.started || won) return;
    let cancelled = false;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        session.tick(view.revision);
        if (session.getView().revision === view.revision) schedule();
      }, session.nextDelay());
    };
    schedule();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [session, view.revision, view.paused, view.game.started, selectionKind, visible, won]);

  return { view, actions };
}
