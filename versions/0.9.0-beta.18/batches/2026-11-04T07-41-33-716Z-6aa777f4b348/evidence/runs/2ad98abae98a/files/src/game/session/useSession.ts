import { useCallback, useRef, useState } from 'react';
import { createGame, MAX_SEED } from '../deal.ts';
import type { GameState, Size } from '../model.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { activateCard, advanceGame, formatTime, isWon } from '../transitions.ts';
import { readPreferences, savePreferences } from './storage.ts';
import { useClock } from './useClock.ts';
import { useAnnouncement } from './useAnnouncement.ts';

function freshGame(size: Size, previousSeed = 0): GameState {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  let seed = (random[0] ?? 0) % MAX_SEED + 1;
  if (seed === previousSeed) seed = seed % MAX_SEED + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Unable to create deal');
  return game;
}
interface SessionState { game: GameState; paused: boolean; generation: number; celebrate: boolean }

export function useSession() {
  const [preferences, setPreferences] = useState(readPreferences);
  const preferencesRef = useRef(preferences);
  const [session, setSession] = useState<SessionState>(() => ({
    game: freshGame(preferences.size), paused: false, generation: 0, celebrate: false,
  }));
  const current = useRef(session);
  const { announcement, announce } = useAnnouncement();
  const commit = useCallback((next: SessionState) => {
    current.current = next;
    setSession(next);
  }, []);
  const advance = useCallback((milliseconds: number) => {
    const state = current.current;
    if (state.paused) return;
    const game = advanceGame(state.game, milliseconds);
    if (game !== state.game) commit({ ...state, game });
  }, [commit]);
  const clock = useClock(advance, session.generation);
  const save = (size: Size, best?: number) => {
    const next = { size, bests: { ...preferencesRef.current.bests } };
    if (best !== undefined) next.bests[size] = Math.min(best, next.bests[size] ?? Infinity);
    preferencesRef.current = next;
    setPreferences(next);
    savePreferences(next);
  };
  const replace = (game: GameState, imported = false) => {
    clock.reset();
    commit({ game, paused: imported && !isWon(game), generation: current.current.generation + 1, celebrate: false });
    save(game.board.size);
  };
  const activate = (index: number) => {
    clock.flush();
    const before = current.current;
    if (before.paused) return;
    const game = activateCard(before.game, index);
    if (game === before.game) return;
    const won = isWon(game);
    commit({ ...before, game, celebrate: won });
    if (before.game.selection.kind !== 'one' || game.selection.kind === 'one') return;
    if (won) {
      save(game.board.size, game.moves);
      announce(`Pair found. All pairs found in ${game.moves} moves and ${formatTime(game.elapsedMs)}.`);
    } else if (game.selection.kind === 'mismatch') {
      announce('No match. Cards close after a short pause.');
    } else {
      const count = game.matched.length / 2;
      announce(`Pair found. ${count} ${count === 1 ? 'pair' : 'pairs'} matched.`);
    }
  };
  const loadBoard = (draft: string) => {
    const game = createGame(draft.trim());
    if (!game) { announce('Invalid board code.'); return false; }
    replace(game);
    return true;
  };
  const loadSnapshot = (draft: string) => {
    const game = decodeSnapshot(draft);
    if (!game) { announce('Invalid snapshot.'); return null; }
    replace(game, true);
    const message = isWon(game) ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.';
    announce(message);
    return message;
  };
  return {
    ...session, announcement, best: preferences.bests[session.game.board.size], activate, loadBoard, loadSnapshot,
    newGame: (size = current.current.game.board.size) => replace(freshGame(size, current.current.game.board.seed)),
    restart: () => { const game = createGame(current.current.game.board.code); if (game) replace(game); },
    resume: () => { clock.flush(); commit({ ...current.current, paused: false }); },
    exportSnapshot: () => { clock.flush(); return encodeSnapshot(current.current.game); },
  };
}
