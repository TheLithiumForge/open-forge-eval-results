import { useEffect, useRef, useState } from 'react';
import type { BoardSize } from '../boardCode.ts';
import { freshGame } from './freshGame.ts';
import { SessionController } from './sessionController.ts';
import { readPreferences, savePreferences } from './storage.ts';

export function useGameSession() {
  const [controller] = useState(() => new SessionController({ now: () => performance.now(),
    fresh: freshGame, read: readPreferences, save: savePreferences }, document.visibilityState !== 'hidden'));
  const [view, setView] = useState(controller.view);
  const timer = useRef<number | null>(null);
  const generation = useRef(0);

  function cancel(): void {
    generation.current++;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }

  function schedule(): void {
    cancel();
    if (!controller.active) return;
    const current = generation.current;
    timer.current = window.setTimeout(() => {
      if (current !== generation.current) return;
      controller.tick();
      setView(controller.view);
      schedule();
    }, controller.delay);
  }

  function run<T>(operation: () => T): T {
    cancel();
    const result = operation();
    setView(controller.view);
    schedule();
    return result;
  }

  useEffect(() => {
    const visibility = () => run(() => controller.setVisible(document.visibilityState !== 'hidden'));
    document.addEventListener('visibilitychange', visibility);
    schedule();
    return () => {
      cancel();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [controller]);

  return { ...view,
    activate: (index: number) => run(() => controller.activate(index)),
    newGame: () => run(() => controller.newGame()),
    restart: () => run(() => controller.restart()),
    changeSize: (size: BoardSize) => run(() => controller.changeSize(size)),
    loadBoard: (code: string) => run(() => controller.loadBoard(code)),
    loadSnapshot: (text: string) => run(() => controller.loadSnapshot(text)),
    exportSnapshot: () => run(() => controller.exportSnapshot()),
    resume: () => run(() => controller.resume()),
  };
}
