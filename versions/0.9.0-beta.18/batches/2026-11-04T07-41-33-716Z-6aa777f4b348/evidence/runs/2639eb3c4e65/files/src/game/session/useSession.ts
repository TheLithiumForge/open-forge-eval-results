import { useCallback, useEffect, useRef, useState } from 'react';
import type { GridSize } from '../deck.ts';
import { formatTime, isWon } from '../model.ts';
import type { GameState } from '../model.ts';
import { activateCard, advanceGame, createGame } from '../transitions.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { freshGame } from './freshGame.ts';
import { readPreferences, savePreferences } from './storage.ts';
import { turnAnnouncement } from './announcement.ts';

type Session = {
  game: GameState; paused: boolean; revision: number; celebrate: boolean;
  notice: string; announcement: { id: number; text: string };
};

export function useSession() {
  const [preferences, setPreferences] = useState(readPreferences);
  const [state, setState] = useState<Session>(() => ({
    game: freshGame(preferences.size), paused: false, revision: 0, celebrate: false,
    notice: '', announcement: { id: 0, text: '' },
  }));
  const current = useRef(state);
  const saved = useRef(preferences);
  const last = useRef(performance.now());
  const visible = useRef(!document.hidden);
  const commit = useCallback((next: Session) => {
    current.current = next;
    setState(next);
  }, []);
  const sync = useCallback((revision: number) => {
    if (current.current.revision !== revision) return;
    const now = performance.now();
    const previous = current.current;
    const game = visible.current && !previous.paused ? advanceGame(previous.game, now - last.current) : previous.game;
    last.current = now;
    if (game !== previous.game) commit({ ...previous, game });
  }, [commit]);

  useEffect(() => {
    let alive = true;
    const revision = state.revision;
    const tick = () => { if (alive) sync(revision); };
    const visibility = () => {
      tick();
      visible.current = !document.hidden;
    };
    const timer = window.setInterval(tick, 32);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [state.revision, sync]);

  // Close at the mismatch deadline even when it falls between display ticks.
  useEffect(() => {
    const selection = state.game.selection;
    if (selection.kind !== 'mismatch' || state.paused || document.hidden) return;
    let alive = true;
    const delay = Math.max(0, selection.remainingMs - (performance.now() - last.current));
    const timer = window.setTimeout(() => { if (alive) sync(state.revision); }, Math.ceil(delay));
    return () => { alive = false; window.clearTimeout(timer); };
  }, [state.game.selection, state.paused, state.revision, sync]);

  function remember(size: GridSize, moves?: number) {
    const old = saved.current;
    const best = old.best[size];
    const next = { size, best: moves !== undefined && (best === undefined || moves < best) ? { ...old.best, [size]: moves } : old.best };
    saved.current = next;
    setPreferences(next);
    savePreferences(next);
  }
  function replace(game: GameState, paused = false, notice = '') {
    const previous = current.current;
    last.current = performance.now();
    visible.current = !document.hidden;
    remember(game.board.size);
    commit({ game, paused, revision: previous.revision + 1, celebrate: false, notice,
      announcement: { id: previous.announcement.id + 1, text: notice } });
  }
  function loadError(text: string) {
    const previous = current.current;
    commit({ ...previous, notice: text, announcement: { id: previous.announcement.id + 1, text } });
  }
  function activate(index: number) {
    sync(current.current.revision);
    const previous = current.current;
    if (previous.paused || document.hidden) return;
    const game = activateCard(previous.game, index);
    if (game === previous.game) return;
    const turn = previous.game.selection.kind === 'one';
    const won = isWon(game);
    if (won) remember(game.board.size, game.moves);
    commit({ ...previous, game, celebrate: won,
      announcement: turn ? { id: previous.announcement.id + 1, text: turnAnnouncement(game) } : previous.announcement });
  }
  function loadBoard(code: string) {
    const game = createGame(code.trim());
    if (game) replace(game); else loadError('Invalid board code.');
  }
  function loadSnapshot(text: string) {
    const game = decodeSnapshot(text);
    if (!game) { loadError('Invalid snapshot.'); return; }
    const won = isWon(game);
    replace(game, !won, won ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
  }
  function exportSnapshot() {
    const previous = current.current;
    const game = visible.current && !previous.paused ? advanceGame(previous.game, performance.now() - last.current) : previous.game;
    return encodeSnapshot(game);
  }
  function resume() {
    last.current = performance.now();
    commit({ ...current.current, paused: false, notice: '' });
  }
  return {
    ...state, best: preferences.best[state.game.board.size], time: formatTime(state.game.elapsedMs),
    activate, loadBoard, loadSnapshot, exportSnapshot, resume,
    newGame: () => replace(freshGame(current.current.game.board.size, current.current.game.board.seed)),
    restart: () => { const game = createGame(current.current.game.board.code); if (game) replace(game); },
    changeSize: (size: GridSize) => { if (size !== current.current.game.board.size) replace(freshGame(size, current.current.game.board.seed)); },
  };
}
