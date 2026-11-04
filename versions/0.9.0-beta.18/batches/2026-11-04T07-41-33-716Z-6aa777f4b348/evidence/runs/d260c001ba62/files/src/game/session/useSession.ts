import { useCallback, useRef, useState } from 'react';
import { MAX_SEED } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { createGame, isWon, SELECTION } from '../state.ts';
import type { GameState } from '../state.ts';
import { activateCard, advanceGame } from '../transitions.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { formatTime } from '../time.ts';
import { readPreferences, writePreferences } from './storage.ts';
import type { Preferences } from './storage.ts';
import { useActiveClock } from './useActiveClock.ts';

interface Session {
  game: GameState;
  preferences: Preferences;
  paused: boolean;
  celebration: boolean;
  generation: number;
}

function freshGame(size: Size, previousSeed = 0): GameState {
  const draw = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  let seed = draw % MAX_SEED + 1;
  if (seed === previousSeed) seed = seed % MAX_SEED + 1;
  const game = createGame(`np1-${size}-${seed}`);
  if (!game) throw new Error('Unable to create deal.');
  return game;
}

export function useSession() {
  const [session, setSession] = useState<Session>(() => {
    const preferences = readPreferences();
    return { game: freshGame(preferences.size), preferences, paused: false, celebration: false, generation: 0 };
  });
  const current = useRef(session);
  const [announcement, setAnnouncement] = useState({ id: 0, text: '' });
  const [status, setStatus] = useState('');
  const announce = (text: string) => setAnnouncement(previous => ({ id: previous.id + 1, text }));
  const loadStatus = (text: string) => { setStatus(text); announce(text); };
  const commit = useCallback((next: Session) => { current.current = next; setSession(next); }, []);
  const advance = useCallback((milliseconds: number) => {
    const before = current.current;
    if (before.paused) return;
    const game = advanceGame(before.game, milliseconds);
    if (game !== before.game) commit({ ...before, game });
  }, [commit]);
  const nextDelay = useCallback(() => {
    const { game, paused } = current.current;
    return !paused && game.selection.kind === SELECTION.mismatch ? Math.min(32, game.selection.remainingMs) : 32;
  }, []);
  const clock = useActiveClock(advance, session.generation, nextDelay);

  function replace(game: GameState, paused = false) {
    clock.rebase();
    const previous = current.current;
    const preferences = { ...previous.preferences, size: game.board.size };
    writePreferences(preferences);
    commit({ game, preferences, paused, celebration: false, generation: previous.generation + 1 });
    setStatus('');
    setAnnouncement(previousAnnouncement => ({ id: previousAnnouncement.id + 1, text: '' }));
  }

  function activate(index: number) {
    clock.flush();
    const before = current.current;
    if (before.paused || document.hidden) return;
    const game = activateCard(before.game, index);
    if (game === before.game) return;
    let preferences = before.preferences;
    const won = isWon(game);
    if (won) {
      const best = preferences.bests[game.board.size];
      if (best === undefined || game.moves < best) {
        preferences = { ...preferences, bests: { ...preferences.bests, [game.board.size]: game.moves } };
        writePreferences(preferences);
      }
    }
    commit({ ...before, game, preferences, celebration: won });
    clock.reschedule();
    if (before.game.selection.kind !== SELECTION.one) return;
    if (won) announce(`Pair found. All pairs found in ${game.moves} moves and ${formatTime(game.elapsedMs)}.`);
    else if (game.selection.kind === SELECTION.mismatch) announce('No match. Cards close after a short pause.');
    else {
      const pairs = game.matched.length / 2;
      announce(`Pair found. ${pairs} ${pairs === 1 ? 'pair' : 'pairs'} matched.`);
    }
  }

  return {
    ...session, status, announcement, activate,
    newGame: () => replace(freshGame(current.current.game.board.size, current.current.game.board.seed)),
    restart: () => {
      const game = createGame(current.current.game.board.code);
      if (game) replace(game);
    },
    changeSize: (size: Size) => {
      if (size !== current.current.game.board.size) replace(freshGame(size, current.current.game.board.seed));
    },
    loadBoard: (text: string) => {
      const game = createGame(text.trim());
      if (!game) { loadStatus('Invalid board code.'); return; }
      replace(game);
    },
    loadSnapshot: (text: string) => {
      const game = decodeSnapshot(text);
      if (!game) { loadStatus('Invalid snapshot.'); return; }
      const won = isWon(game);
      replace(game, !won);
      loadStatus(won ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
    },
    exportSnapshot: () => { clock.flush(); return encodeSnapshot(current.current.game); },
    resume: () => {
      clock.rebase();
      commit({ ...current.current, paused: false });
      clock.reschedule();
      setStatus('');
    },
  };
}
