import { useCallback, useRef, useState } from 'react';
import { isGridSize } from '../boardCode.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { activateCard, createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { announce, turnResult } from './announcements.ts';
import { freshGame } from './seed.ts';
import { initialSession } from './sessionState.ts';
import type { SessionState } from './sessionState.ts';
import { browserStorage, readPreferences, saveBest, saveSize } from './storage.ts';
import { useSessionClock } from './useClock.ts';

export function useSession() {
  const [initial] = useState(() => {
    const storage = browserStorage();
    const preferences = readPreferences(storage);
    return { storage, state: initialSession(freshGame(preferences.size), preferences.bests) };
  });
  const [state, setState] = useState(initial.state);
  const current = useRef(state);
  const publish = useCallback((next: SessionState) => {
    if (next === current.current) return;
    current.current = next;
    setState(next);
  }, []);
  const { sample, resetClock } = useSessionClock(current, publish);

  function status(text: string): void {
    const previous = sample();
    publish({ ...previous, loadStatus: text, announcement: announce(previous.announcement, text) });
  }

  function replace(game: GameState, paused = false, loadStatus = ''): void {
    const previous = current.current;
    resetClock();
    publish({ ...previous, game, paused, celebrate: false, resetId: previous.resetId + 1,
      loadStatus, announcement: announce(previous.announcement, loadStatus) });
    saveSize(initial.storage, game.board.size);
  }

  function activate(index: number): void {
    const previous = sample();
    if (previous.paused) return;
    const game = activateCard(previous.game, index);
    const text = turnResult(previous.game, game);
    let bests = previous.bests;
    const won = game !== previous.game && isWon(game);
    if (won) {
      const best = bests[game.board.size];
      if (best === undefined || game.moves < best) {
        bests = { ...bests, [game.board.size]: game.moves };
        saveBest(initial.storage, game.board.size, game.moves);
      }
    }
    publish({ ...previous, game, bests, celebrate: previous.celebrate || won,
      announcement: text === null ? previous.announcement : announce(previous.announcement, text) });
  }

  function loadBoard(text: string): boolean {
    const game = createGame(text.trim());
    if (game === null) { status('Invalid board code.'); return false; }
    replace(game, false, 'Loaded board.');
    return true;
  }

  function loadSnapshot(text: string): boolean {
    const game = decodeSnapshot(text);
    if (game === null) { status('Invalid snapshot.'); return false; }
    const completed = isWon(game);
    replace(game, !completed, completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
    return true;
  }

  return {
    game: state.game, paused: state.paused, celebrate: state.celebrate, resetId: state.resetId,
    best: state.bests[state.game.board.size] ?? null,
    announcement: state.announcement, loadStatus: state.loadStatus,
    activate, loadBoard, loadSnapshot,
    newGame: () => replace(freshGame(current.current.game.board.size, current.current.game.board.seed)),
    restart: () => {
      const game = createGame(current.current.game.board.code);
      if (game !== null) replace(game);
    },
    changeSize: (value: unknown) => {
      if (isGridSize(value) && value !== current.current.game.board.size) {
        replace(freshGame(value, current.current.game.board.seed));
      }
    },
    exportSnapshot: (): string => {
      const next = sample();
      publish(next);
      return encodeSnapshot(next.game);
    },
    resume: () => {
      if (!current.current.paused) return;
      resetClock();
      publish({ ...current.current, paused: false });
    },
  };
}

export type GameSession = ReturnType<typeof useSession>;
