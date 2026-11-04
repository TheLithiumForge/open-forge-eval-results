import { useCallback, useRef, useState } from 'react';
import type { Size } from '../boardCode.ts';
import { formatTime } from '../format.ts';
import { createGame, isWon, SELECTION } from '../model.ts';
import type { GameState } from '../model.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { activateCard, advanceGame } from '../transitions.ts';
import { freshDeal } from './freshDeal.ts';
import { readPreferences, recordBest, saveSize } from './storage.ts';
import type { Scores } from './storage.ts';
import { useActiveClock } from './useActiveClock.ts';
import { useAnnouncer } from './useAnnouncer.ts';

interface Session {
  readonly game: GameState;
  readonly scores: Scores;
  readonly paused: boolean;
  readonly deal: number;
  readonly celebrate: boolean;
}

function initialSession(): Session {
  const { size, scores } = readPreferences();
  return { game: freshDeal(size), scores, paused: false, deal: 0, celebrate: false };
}

export function useSession() {
  const [session, setSession] = useState(initialSession);
  const current = useRef(session);
  const { message, announce } = useAnnouncer();
  const commit = useCallback((next: Session) => {
    current.current = next;
    setSession(next);
  }, []);
  const advance = useCallback((milliseconds: number, deal: number) => {
    const previous = current.current;
    if (previous.deal !== deal || previous.paused) return;
    const game = advanceGame(previous.game, milliseconds);
    if (game !== previous.game) commit({ ...previous, game });
  }, [commit]);
  const remainingMs = session.game.selection.kind === SELECTION.mismatch
    ? session.game.selection.remainingMs : null;
  const flush = useActiveClock(advance, session.deal, remainingMs);

  const activate = useCallback((index: number) => {
    flush();
    const previous = current.current;
    if (previous.paused || document.hidden) return;
    const game = activateCard(previous.game, index);
    if (game === previous.game) return;
    const won = isWon(game);
    let scores = previous.scores;
    if (won) scores = recordBest(scores, game.board.size, game.moves);
    commit({ ...previous, game, scores, celebrate: won });
    if (previous.game.selection.kind === SELECTION.one) {
      if (won) announce(`Pair found. All pairs found in ${game.moves} moves and ${formatTime(game.elapsedMs)}.`);
      else if (game.selection.kind === SELECTION.mismatch) announce('No match. Cards close after a short pause.');
      else {
        const pairs = game.matched.length / 2;
        announce(`Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`);
      }
    }
  }, [announce, commit, flush]);

  const replace = (game: GameState, paused = false) => {
    flush();
    const previous = current.current;
    saveSize(game.board.size);
    commit({ ...previous, game, paused, deal: previous.deal + 1, celebrate: false });
  };
  const newGame = (size: Size = current.current.game.board.size) => {
    replace(freshDeal(size, current.current.game.board.code));
  };
  const restart = () => {
    const game = createGame(current.current.game.board.code);
    if (game) replace(game);
  };
  const loadBoard = (draft: string): boolean => {
    const game = createGame(draft.trim());
    if (!game) { announce('Invalid board code.'); return false; }
    replace(game);
    announce('Loaded board.');
    return true;
  };
  const loadSnapshot = (draft: string): string => {
    const game = decodeSnapshot(draft);
    if (!game) { announce('Invalid snapshot.'); return 'Invalid snapshot.'; }
    const completed = isWon(game);
    replace(game, !completed);
    const status = completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.';
    announce(status);
    return status;
  };
  const exportSnapshot = (): string => { flush(); return encodeSnapshot(current.current.game); };
  const resume = () => {
    flush();
    commit({ ...current.current, paused: false });
  };

  return { ...session, message, activate, newGame, restart, loadBoard, loadSnapshot, exportSnapshot, resume };
}
