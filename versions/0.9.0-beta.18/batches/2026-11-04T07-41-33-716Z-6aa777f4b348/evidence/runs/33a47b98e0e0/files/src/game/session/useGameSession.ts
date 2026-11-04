import { useEffect, useState, useSyncExternalStore } from 'react';
import { GameSession } from './dealActions.ts';
import { makeBrowserEnvironment, type SessionView } from './environment.ts';

export interface GameSessionView extends SessionView {
  readonly activateCard: GameSession['activateCard'];
  readonly newGame: GameSession['newGame'];
  readonly restart: GameSession['restart'];
  readonly changeSize: GameSession['changeSize'];
  readonly loadBoard: GameSession['loadBoard'];
  readonly loadSnapshot: GameSession['loadSnapshot'];
  readonly exportSnapshot: GameSession['exportSnapshot'];
  readonly resume: GameSession['resume'];
}

export function useGameSession(): GameSessionView {
  const [session] = useState(() => new GameSession(makeBrowserEnvironment()));
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);

  useEffect(() => {
    session.start();
    return () => session.stop();
  }, [session]);

  return {
    ...view,
    activateCard: session.activateCard,
    newGame: session.newGame,
    restart: session.restart,
    changeSize: session.changeSize,
    loadBoard: session.loadBoard,
    loadSnapshot: session.loadSnapshot,
    exportSnapshot: session.exportSnapshot,
    resume: session.resume,
  };
}
