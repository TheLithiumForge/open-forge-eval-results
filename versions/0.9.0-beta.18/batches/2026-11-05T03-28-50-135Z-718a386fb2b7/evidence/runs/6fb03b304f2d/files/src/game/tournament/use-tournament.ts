import { useEffect, useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { useGame } from '../session/use-game.ts';
import {
  createTournament,
  encodeExchange,
  nameError,
  normalizeName,
  recordScore,
} from './tournament.ts';
import { decodeExchange } from './decode.ts';
import { readHistory, writeHistory } from './history.ts';
import type { TournamentState } from './tournament.ts';

export function useTournament() {
  const controller = useGame(true);
  const [initial] = useState(readHistory);
  const [history, setHistory] = useState(initial.items);
  const [storageFailed, setStorageFailed] = useState(initial.failed);
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(Array<string>(8).fill(''));
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<(() => void) | null>(null);
  const recorded = useRef(false);
  useEffect(() => {
    if (
      !tournament ||
      tournament.phase !== 'playing' ||
      !isWon(controller.session.game) ||
      recorded.current
    )
      return;
    recorded.current = true;
    const next = recordScore(tournament, {
      moves: controller.session.game.moves,
      elapsedMs: controller.session.game.elapsedMs,
    });
    setTournament(next);
    if (next.phase === 'complete') {
      const items = [next, ...history].slice(0, 10);
      setHistory(items);
      if (!writeHistory(items).saved) setStorageFailed(true);
    }
  }, [controller.session.game, tournament, history]);
  function confirmLeave(action: () => void) {
    if (tournament && tournament.phase !== 'complete') setPending(() => action);
    else action();
  }
  function start() {
    const cleaned = names.slice(0, count).map(normalizeName);
    const error = nameError(cleaned);
    if (error) {
      setNotice(error);
      return;
    }
    setTournament(createTournament(cleaned));
    setNotice('');
  }
  function startTurn() {
    if (!tournament) return;
    controller.loadBoard(tournament.matches[tournament.current]!.code);
    recorded.current = false;
    setTournament({ ...tournament, phase: 'playing' });
    setNotice('');
  }
  function exportTournament() {
    setDraft(
      encodeExchange(
        tournament,
        tournament?.phase === 'playing' ? controller.exportSnapshot() : null,
      ),
    );
    setNotice('Tournament exported.');
  }
  function loadTournament() {
    const result = decodeExchange(draft);
    if (!result.value) {
      setNotice(result.error ?? 'Invalid tournament.');
      return;
    }
    const value = result.value;
    confirmLeave(() => {
      if (value.snapshot) {
        controller.loadSnapshot(value.snapshot);
        controller.resume();
      }
      recorded.current = false;
      if (
        value.tournament?.phase === 'complete' &&
        !history.some((item) => JSON.stringify(item) === JSON.stringify(value.tournament))
      ) {
        const items = [value.tournament, ...history].slice(0, 10);
        setHistory(items);
        if (!writeHistory(items).saved) setStorageFailed(true);
      }
      setTournament(value.tournament);
      setNotice('Tournament loaded.');
    });
  }
  return {
    controller,
    history,
    storageFailed,
    count,
    setCount,
    names,
    setNames,
    tournament,
    setTournament,
    draft,
    setDraft,
    notice,
    setNotice,
    pending,
    setPending,
    confirmLeave,
    start,
    startTurn,
    exportTournament,
    loadTournament,
  };
}
