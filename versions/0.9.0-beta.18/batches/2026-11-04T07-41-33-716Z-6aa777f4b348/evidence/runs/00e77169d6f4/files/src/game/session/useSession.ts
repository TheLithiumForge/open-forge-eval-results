import { useCallback, useRef, useState } from 'react';
import { MAX_SEED } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { activateCard, advanceGame, createGame, formatTime, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { readBests, readSize, saveBest, saveSize } from './storage.ts';
import type { BestScores } from './storage.ts';
import { useClock } from './useClock.ts';

type Session = {
  game: GameState; generation: number; paused: boolean; celebrate: boolean;
  best: BestScores; status: string; announcement: { id: number; text: string };
};
function fresh(size: Size, previousSeed = 0): GameState {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  let seed = ((random[0] ?? 0) % MAX_SEED) + 1;
  if (seed === previousSeed) seed = seed % MAX_SEED + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Unable to create board.');
  return game;
}
function initialSession(): Session {
  return { game: fresh(readSize()), generation: 0, paused: false, celebrate: false,
    best: readBests(), status: '', announcement: { id: 0, text: '' } };
}

export function useSession() {
  const [session, render] = useState(initialSession);
  const current = useRef(session);
  const publish = useCallback((next: Session) => { current.current = next; render(next); }, []);
  const advance = useCallback((milliseconds: number) => {
    const previous = current.current;
    if (!previous.paused) {
      const game = advanceGame(previous.game, milliseconds);
      if (game !== previous.game) publish({ ...previous, game });
    }
    const selection = current.current.game.selection;
    return selection.kind === 'mismatch' ? Math.min(100, selection.remainingMs) : 100;
  }, [publish]);
  const flush = useClock({ enabled: session.game.started && !isWon(session.game) && !session.paused,
    generation: session.generation, advance });

  const announce = (text: string, status = current.current.status) => {
    const previous = current.current;
    publish({ ...previous, status, announcement: { id: previous.announcement.id + 1, text } });
  };
  const replace = (game: GameState, paused: boolean, status: string) => {
    const previous = current.current;
    saveSize(game.board.size);
    publish({ ...previous, game, generation: previous.generation + 1, paused, celebrate: false, status,
      announcement: { id: previous.announcement.id + 1, text: status } });
  };
  const activate = (index: number) => {
    flush();
    const previous = current.current;
    if (previous.paused) return;
    const game = activateCard(previous.game, index);
    if (game === previous.game) return;
    let { best, announcement } = previous;
    const won = isWon(game);
    if (previous.game.selection.kind === 'one' && game.selection.kind !== 'one') {
      const pairs = game.matched.length / 2;
      const text = game.selection.kind === 'mismatch' ? 'No match. Cards close after a short pause.'
        : won ? `Pair found. All pairs found in ${game.moves} moves and ${formatTime(game.elapsedMs)}.`
          : `Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`;
      announcement = { id: announcement.id + 1, text };
    }
    if (won) best = saveBest(best, game.board.size, game.moves);
    publish({ ...previous, game, best, announcement, celebrate: won });
  };
  return {
    ...session, activate,
    newGame: () => replace(fresh(current.current.game.board.size, current.current.game.board.seed), false, ''),
    resize: (size: Size) => {
      if (size !== current.current.game.board.size) replace(fresh(size, current.current.game.board.seed), false, '');
    },
    restart: () => {
      const game = createGame(current.current.game.board.code);
      if (game) replace(game, false, '');
    },
    loadBoard: (draft: string) => {
      const game = createGame(draft.trim());
      if (!game) { announce('Invalid board code.', 'Invalid board code.'); return; }
      replace(game, false, '');
    },
    loadSnapshot: (draft: string) => {
      const game = decodeSnapshot(draft);
      if (!game) { announce('Invalid snapshot.', 'Invalid snapshot.'); return; }
      const won = isWon(game);
      replace(game, !won, won ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
    },
    exportSnapshot: () => { flush(); return encodeSnapshot(current.current.game); },
    resume: () => publish({ ...current.current, paused: false }),
  };
}
