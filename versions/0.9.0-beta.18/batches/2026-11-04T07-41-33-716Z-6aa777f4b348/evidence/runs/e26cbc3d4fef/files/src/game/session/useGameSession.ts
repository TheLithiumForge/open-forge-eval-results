import { useEffect, useRef, useState } from 'react';
import type { GridSize } from '../boardCode.ts';
import { advanceGame, createGame } from '../game.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { isWon, selectionKinds } from '../state.ts';
import { sampleActiveClock } from './activeClock.ts';
import { freshDeal } from './deal.ts';
import { loadBoard, loadSnapshot } from './loads.ts';
import { activateSession, initialSession, replaceSession } from './sessionState.ts';
import type { SessionState } from './sessionState.ts';
import { readPreferences, savePreferences } from './storage.ts';

const CLOCK_REFRESH_MS = 50;

function startSession(): SessionState {
  const preferences = readPreferences();
  return initialSession(freshDeal(preferences.size), preferences);
}

export function useGameSession() {
  const [view, setView] = useState(startSession);
  const current = useRef(view);
  const clock = useRef({ at: performance.now(), active: !document.hidden });

  function publish(next: SessionState): void {
    const previous = current.current;
    if (next === previous) return;
    current.current = next;
    setView(next);
    if (next.preferences !== previous.preferences) savePreferences(next.preferences);
  }

  function resetClock(): void {
    clock.current = { at: performance.now(), active: !document.hidden && !current.current.paused };
  }

  function flush(): SessionState {
    const session = current.current;
    const sample = sampleActiveClock(clock.current, performance.now(), !document.hidden && !session.paused);
    clock.current = sample.clock;
    const game = advanceGame(session.game, sample.milliseconds);
    const next = game === session.game ? session : { ...session, game };
    publish(next);
    return next;
  }

  function replace(next: SessionState): void {
    publish(next);
    resetClock();
  }

  const won = isWon(view.game);
  useEffect(() => {
    const revision = view.revision;
    let disposed = false;
    let pending: number | undefined;
    const valid = () => !disposed && current.current.revision === revision;
    function clear(): void {
      if (pending !== undefined) window.clearTimeout(pending);
      pending = undefined;
    }
    function schedule(): void {
      if (!valid()) return;
      const { game, paused } = current.current;
      if (document.hidden || paused || !game.started || isWon(game)) return;
      const delay = game.selection.kind === selectionKinds.mismatch
        ? Math.max(1, Math.min(CLOCK_REFRESH_MS, game.selection.remainingMs)) : CLOCK_REFRESH_MS;
      pending = window.setTimeout(tick, delay);
    }
    function tick(): void {
      if (!valid()) return;
      flush();
      schedule();
    }
    function visibilityChanged(): void {
      if (!valid()) return;
      flush();
      clear();
      schedule();
    }
    document.addEventListener('visibilitychange', visibilityChanged);
    schedule();
    return () => {
      disposed = true;
      clear();
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [view.revision, view.paused, view.game.started, won]);

  return {
    ...view, best: view.preferences.bests[view.game.board.size] ?? null,
    activate(index: number): void {
      const session = flush();
      if (!document.hidden) publish(activateSession(session, index));
    },
    newGame(): void {
      const { game } = current.current;
      replace(replaceSession(current.current, freshDeal(game.board.size, game.board.seed)));
    },
    restart(): void {
      replace(replaceSession(current.current, createGame(current.current.game.board.code)));
    },
    chooseSize(size: GridSize): void {
      if (size === current.current.game.board.size) return;
      replace(replaceSession(current.current, freshDeal(size, current.current.game.board.seed)));
    },
    loadBoard(draft: string): boolean {
      const previous = current.current;
      const next = loadBoard(previous, draft);
      if (next.revision !== previous.revision) replace(next); else publish(next);
      return next.revision !== previous.revision;
    },
    loadSnapshot(draft: string): boolean {
      const previous = current.current;
      const next = loadSnapshot(previous, draft);
      if (next.revision !== previous.revision) replace(next); else publish(next);
      return next.revision !== previous.revision;
    },
    resume(): void {
      if (!current.current.paused) return;
      publish({ ...current.current, paused: false, loadStatus: '' });
      resetClock();
    },
    exportSnapshot(): string { return encodeSnapshot(flush().game); },
  };
}

export type GameSession = ReturnType<typeof useGameSession>;
