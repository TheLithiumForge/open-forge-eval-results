import { useEffect, useRef, useState } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import { formatElapsed } from '../elapsed-time.ts';
import { createGame, isWon } from '../game.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { isJsonObject } from '../saved-format.ts';
import { activateSession, initialSession, replaceGame } from '../session/session.ts';
import type { Session } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import {
  createTournament,
  currentMatch,
  currentPlayer,
  nameError,
  normalizeName,
  recordResult,
} from './tournament.ts';
import { exportTournament, importTournament } from './tournament-format.ts';
import type { Tournament } from './tournament.ts';
import { readHistory, saveHistory } from './tournament-storage.ts';

export function useTournament() {
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(Array<string>(8).fill(''));
  const [t, setTournament] = useState<Tournament | null>(null);
  const [history, setHistory] = useState(readHistory);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const board = useRef<BoardFocus>(null);
  const [session, setSession] = useState(() =>
    initialSession('np1-4-1', { size: 4, bestMoves: {} }),
  );
  const current = useRef(session);
  function commit(next: Session): void {
    current.current = next;
    setSession(next);
  }
  const clock = useSessionClock(session, current, commit);
  useEffect(() => {
    heading.current?.focus();
  }, [t?.phase, t?.round, t?.match]);
  useEffect(() => {
    if (confirmAction) {
      dialog.current?.showModal();
      keep.current?.focus();
    }
  }, [confirmAction]);
  function leave(action: () => void): void {
    function perform(): void {
      if (t?.phase === 'playing') {
        clock.synchronize();
        clock.reset();
        commit({ ...current.current, paused: true });
      }
      action();
    }
    if (t && t.phase !== 'champion') setConfirmAction(() => perform);
    else perform();
  }
  function start(): void {
    const clean = names.slice(0, count).map(normalizeName);
    const error = nameError(clean);
    if (error) {
      setNotice(error);
      return;
    }
    const created = createTournament(clean);
    setNotice(`Now playing: ${created.names[currentPlayer(created)]}`);
    setTournament(created);
  }
  function startTurn(): void {
    if (!t) return;
    if (t.phase === 'playing' && current.current.paused) {
      clock.reset();
      commit({ ...current.current, paused: false });
      board.current?.focusRemembered();
      return;
    }
    setNotice('');
    clock.reset();
    const next = replaceGame(current.current, createGame(currentMatch(t).code), false);
    commit(next);
    setTournament({ ...t, phase: 'playing', game: null });
  }
  function activate(index: number): void {
    if (!t || t.phase !== 'playing') return;
    clock.synchronize();
    // Competition sessions deliberately retain the solo-independent preference object.
    const previous = current.current;
    const next = activateSession(previous, index);
    if (next !== previous) setNotice('');
    commit({ ...next, preferences: previous.preferences });
    if (!isWon(previous.game) && isWon(next.game)) {
      const updated = recordResult(t, next.game);
      setTournament(updated);
      setNotice(
        updated.phase === 'turnDone'
          ? `${t.names[currentPlayer(t)]} finished in ${next.game.moves} moves and ${formatElapsed(next.game.elapsedMs)}.`
          : `${t.names[currentMatch(updated).winner!]} wins the match.`,
      );
      if (updated.phase === 'champion') {
        const nextHistory = [updated, ...history];
        setHistory(nextHistory);
        saveHistory(nextHistory);
      }
    }
  }
  function load(): void {
    try {
      const value: unknown = JSON.parse(draft);
      if (isJsonObject(value)) {
        const object = value;
        if (
          Object.keys(object).length === 3 &&
          object.format === 'neon-pairs/tournament' &&
          object.version === 1 &&
          object.tournament === null
        ) {
          leave(() => {
            setTournament(null);
            setNotice('Tournament loaded.');
          });
          return;
        }
      }
    } catch {
      /* The tournament decoder supplies the error. */
    }
    const result = importTournament(draft);
    if (!result.tournament) {
      setNotice(result.error);
      return;
    }
    const loaded = result.tournament;
    leave(() => {
      if (loaded.phase === 'playing') {
        const game = decodeSnapshot(loaded.game!);
        if (!game) return;
        clock.reset();
        commit(replaceGame(current.current, game, true));
      }
      setTournament(loaded);
      if (
        loaded.phase === 'champion' &&
        !history.some((past) => exportTournament(past) === exportTournament(loaded))
      ) {
        const nextHistory = [loaded, ...history];
        setHistory(nextHistory);
        saveHistory(nextHistory);
      }
      setNotice('Tournament loaded.');
    });
  }
  function exportCurrent(): void {
    if (!t) {
      setDraft(
        JSON.stringify({ format: 'neon-pairs/tournament', tournament: null, version: 1 }, null, 2),
      );
      setNotice('Start or select a tournament to export its results.');
      return;
    }
    clock.synchronize();
    setDraft(exportTournament(t, current.current.game));
    setNotice('Tournament exported.');
  }
  return {
    count,
    setCount,
    names,
    setNames,
    t,
    setTournament,
    history,
    draft,
    setDraft,
    notice,
    setNotice,
    confirmAction,
    setConfirmAction,
    heading,
    dialog,
    keep,
    board,
    session,
    leave,
    start,
    startTurn,
    activate,
    load,
    exportCurrent,
  };
}
