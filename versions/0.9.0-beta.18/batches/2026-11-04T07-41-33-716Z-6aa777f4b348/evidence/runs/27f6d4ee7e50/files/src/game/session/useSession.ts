import { useRef, useState } from "react";
import { isBoardSize } from "../boardCode.ts";
import type { BoardSize } from "../boardCode.ts";
import { decodeSnapshot, encodeSnapshot } from "../snapshot.ts";
import { activateCard as applyCard, advanceGame, createGame, isWon } from "../state.ts";
import type { GameState } from "../state.ts";
import { turnAnnouncement } from "./announcements.ts";
import { freshGame, gameForCode } from "./deals.ts";
import { readPreferences, writePreferences } from "./storage.ts";
import type { Preferences } from "./storage.ts";
import { useGameClock } from "./useGameClock.ts";

export interface SessionEvent {
  readonly id: number;
  readonly text: string;
}

interface SessionState {
  readonly game: GameState;
  readonly paused: boolean;
  readonly revision: number;
  readonly celebrationId: number | null;
  readonly preferences: Preferences;
  readonly event: SessionEvent;
  readonly status: string | null;
}

export interface GameSession {
  readonly game: GameState;
  readonly paused: boolean;
  readonly bestMoves: number | null;
  readonly revision: number;
  readonly celebrationId: number | null;
  readonly event: SessionEvent;
  readonly status: string | null;
  readonly activateCard: (index: number) => void;
  readonly startNewGame: () => void;
  readonly restart: () => void;
  readonly changeSize: (size: BoardSize) => void;
  readonly loadBoard: (boardCode: string) => void;
  readonly loadSnapshot: (text: string) => void;
  readonly exportSnapshot: () => string;
  readonly resume: () => void;
}

function initialSession(): SessionState {
  const preferences = readPreferences();
  return {
    game: freshGame(preferences.size), paused: false, revision: 0,
    celebrationId: null, preferences, event: { id: 0, text: "" }, status: null,
  };
}

export function useSession(): GameSession {
  const [session, setSession] = useState(initialSession);
  const stateRef = useRef(session);
  const eventId = useRef(0);
  const refreshClock = useRef<() => void>(() => undefined);
  const invalidateClock = useRef<() => void>(() => undefined);

  const clock = useGameClock(session.game, session.paused, () => stateRef.current, (milliseconds) => {
    const previous = stateRef.current;
    const game = advanceGame(previous.game, milliseconds);
    if (game !== previous.game) {
      const next = { ...previous, game };
      stateRef.current = next;
      setSession(next);
      refreshClock.current();
    }
  });
  refreshClock.current = clock.refresh;
  invalidateClock.current = clock.invalidate;

  const commit = (next: SessionState): void => {
    const previous = stateRef.current;
    const invalidatesTimer = next.game !== previous.game || next.paused !== previous.paused;
    stateRef.current = next;
    setSession(next);
    if (invalidatesTimer) invalidateClock.current();
    else refreshClock.current();
  };

  const makeEvent = (text: string): SessionEvent => {
    eventId.current += 1;
    return { id: eventId.current, text };
  };

  const syncClock = clock.sync;

  const activateCard = (index: number): void => {
    syncClock();
    const previous = stateRef.current;
    if (previous.paused) return;
    const game = applyCard(previous.game, index);
    if (game === previous.game) return;

    const text = turnAnnouncement(previous.game, game);
    const winningTurn = !isWon(previous.game) && isWon(game);
    let preferences = previous.preferences;
    if (winningTurn) {
      const oldBest = preferences.bestMoves[game.board.size];
      if (oldBest === undefined || game.moves < oldBest) {
        preferences = {
          size: game.board.size,
          bestMoves: Object.freeze({ ...preferences.bestMoves, [game.board.size]: game.moves }),
        };
        writePreferences(preferences);
      }
    }
    commit({
      ...previous, game, preferences,
      celebrationId: winningTurn ? eventId.current + 1 : previous.celebrationId,
      event: text === null ? previous.event : makeEvent(text),
    });
  };

  const startGame = (game: GameState, preferences = stateRef.current.preferences): void => {
    const previous = stateRef.current;
    commit({ ...previous, game, preferences, paused: false, revision: previous.revision + 1,
      celebrationId: null, status: null });
  };

  const startNewGame = (): void => {
    syncClock();
    const game = stateRef.current.game;
    startGame(freshGame(game.board.size, game.board.seed));
  };

  const restart = (): void => {
    syncClock();
    startGame(gameForCode(stateRef.current.game.board.code));
  };

  const changeSize = (size: BoardSize): void => {
    syncClock();
    const previous = stateRef.current;
    if (!isBoardSize(size) || size === previous.game.board.size) return;
    const preferences: Preferences = { ...previous.preferences, size };
    writePreferences(preferences);
    startGame(freshGame(size), preferences);
  };

  const loadBoard = (boardCode: string): void => {
    syncClock();
    const previous = stateRef.current;
    const game = createGame(boardCode.trim());
    if (game === null) {
      const status = "Invalid board code.";
      commit({ ...previous, status, event: makeEvent(status) });
      return;
    }
    const preferences: Preferences = { ...previous.preferences, size: game.board.size };
    writePreferences(preferences);
    startGame(game, preferences);
  };

  const loadSnapshot = (text: string): void => {
    syncClock();
    const previous = stateRef.current;
    const game = decodeSnapshot(text);
    if (game === null) {
      const status = "Invalid snapshot.";
      commit({ ...previous, status, event: makeEvent(status) });
      return;
    }
    const completed = isWon(game);
    const status = completed ? "Loaded completed snapshot." : "Loaded snapshot. Select Resume to continue.";
    const preferences: Preferences = { ...previous.preferences, size: game.board.size };
    writePreferences(preferences);
    commit({ ...previous, game, preferences, paused: !completed,
      revision: previous.revision + 1, celebrationId: null, status, event: makeEvent(status) });
  };

  const exportSnapshot = (): string => {
    const current = stateRef.current;
    return encodeSnapshot(clock.gameAtNow(current.game));
  };

  const resume = (): void => {
    syncClock();
    const previous = stateRef.current;
    if (!previous.paused || isWon(previous.game)) return;
    commit({ ...previous, paused: false, status: null });
  };

  return {
    game: session.game, paused: session.paused,
    bestMoves: session.preferences.bestMoves[session.game.board.size] ?? null,
    revision: session.revision, celebrationId: session.celebrationId,
    event: session.event, status: session.status,
    activateCard, startNewGame, restart, changeSize, loadBoard, loadSnapshot, exportSnapshot, resume,
  };
}
