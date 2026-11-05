import { useEffect, useState } from 'react';
import { isWon } from '../game.ts';
import { useGame } from '../session/use-game.ts';
import { currentMatch, nextMatch, recordResult } from './tournament.ts';
import { decodeTournament } from './decode-tournament.ts';
import type { Tournament } from './tournament.ts';

const HISTORY_KEY = 'neon-pairs.tournaments.v1';

function readHistory(): Tournament[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item: unknown) => {
      const tournament = decodeTournament(JSON.stringify(item));
      return tournament?.phase === 'complete' ? [tournament] : [];
    });
  } catch {
    return [];
  }
}

export function useTournament() {
  const controller = useGame();
  const { session } = controller;
  const [count, setCount] = useState(4);
  const [names, setNames] = useState<string[]>(Array(8).fill(''));
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [history, setHistory] = useState(readHistory);
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (tournament?.phase !== 'playing' || !isWon(session.game)) return;
    setTournament((current) =>
      current?.phase === 'playing'
        ? recordResult(current, {
            moves: session.game.moves,
            elapsedMs: Math.floor(session.game.elapsedMs),
          })
        : current,
    );
  }, [tournament, session.game]);

  function saveFinished(finished: Tournament): void {
    const updated = [finished, ...history];
    setHistory(updated);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
      setNotice(
        'Tournament finished, but browser storage is unavailable. Export it to keep a copy.',
      );
    }
  }

  function exportTournament(): void {
    if (!tournament) {
      setJson(JSON.stringify({ version: 1, setup: true, count, names }, null, 2));
    } else {
      const snapshot = tournament.phase === 'playing' ? controller.exportSnapshot() : null;
      setJson(JSON.stringify({ ...tournament, snapshot }, null, 2));
    }
    setNotice('Tournament JSON exported.');
  }

  function loadTournament(): void {
    try {
      const setup: unknown = JSON.parse(json);
      if (
        typeof setup === 'object' &&
        setup !== null &&
        'setup' in setup &&
        setup.setup === true &&
        'version' in setup &&
        setup.version === 1 &&
        'count' in setup &&
        (setup.count === 4 || setup.count === 8) &&
        'names' in setup &&
        Array.isArray(setup.names) &&
        setup.names.length === 8 &&
        setup.names.every((name: unknown) => typeof name === 'string' && name.length <= 80)
      ) {
        setCount(setup.count);
        setNames(setup.names);
        setTournament(null);
        setNotice('Tournament setup loaded.');
        return;
      }
    } catch {
      /* Report invalid input below. */
    }
    const loaded = decodeTournament(json);
    if (!loaded) {
      setNotice('Invalid tournament JSON.');
      return;
    }
    if (loaded.phase === 'playing' && loaded.snapshot) controller.loadSnapshot(loaded.snapshot);
    setTournament(loaded);
    setNotice(
      loaded.phase === 'playing'
        ? 'Tournament loaded. Resume the turn to continue.'
        : 'Tournament loaded.',
    );
  }

  function startTurn(): void {
    if (!tournament) return;
    controller.loadBoard(currentMatch(tournament).boardCode);
    setTournament({ ...tournament, phase: 'playing', snapshot: null });
    setNotice('');
  }

  function advanceMatch(): void {
    if (!tournament) return;
    const next = nextMatch(tournament);
    setTournament(next);
    if (next.phase === 'complete') saveFinished(next);
  }

  return {
    controller,
    count,
    setCount,
    names,
    setNames,
    tournament,
    setTournament,
    history,
    json,
    setJson,
    notice,
    setNotice,
    exportTournament,
    loadTournament,
    startTurn,
    advanceMatch,
  };
}
