import { useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { browserStore } from '../session/use-saved-preferences.ts';
import { useTournamentClock } from '../session/use-tournament-clock.ts';
import { matchSpecs } from './bracket.ts';
import { decodeTournament, encodeTournament, encodeTournamentSetup } from './format.ts';
import { acceptedNames, recordOf } from './model.ts';
import type { TournamentImport, TournamentRecord, TournamentState } from './model.ts';
import {
  createTournament,
  activateTournamentCard,
  nextMatch,
  nextTurn,
  startTurn,
} from './rules.ts';
import { readTournamentHistory, saveTournamentHistory } from './storage.ts';
import { findUnknownTournamentField } from './validation.ts';

export function useTournament() {
  const [store] = useState(browserStore);
  const [initial] = useState(() => readTournamentHistory(store));
  const [history, setHistory] = useState<readonly TournamentRecord[]>(initial.records);
  const historyRef = useRef(initial.records);
  const [storageAvailable, setStorageAvailable] = useState(initial.available);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const current = useRef<TournamentState | null>(null);
  const [notice, setNotice] = useState('');
  const [feedback, setFeedback] = useState('');
  const [announcement, setAnnouncement] = useState(0);
  const clock = useTournamentClock(tournament, current, commit);

  function archive(record: TournamentRecord): void {
    const saved = saveTournamentHistory(store, record, historyRef.current);
    historyRef.current = saved.records;
    setHistory(saved.records);
    setStorageAvailable(saved.available);
  }

  function commit(next: TournamentState | null, saveFinished = true): void {
    const previous = current.current;
    if (next === previous) return;
    current.current = next;
    setTournament(next);
    if (
      saveFinished &&
      next?.championSeed !== null &&
      next?.championSeed !== undefined &&
      previous?.championSeed === null
    ) {
      const record = recordOf(next);
      if (record) archive(record);
    }
  }

  function begin(names: readonly string[]): boolean {
    const players = acceptedNames(names, names.length);
    if (!players || (players.length !== 4 && players.length !== 8)) return false;
    const specs = matchSpecs(players.length);
    const used = new Set<string>();
    const codes = specs.map((spec) => {
      let code = freshBoardCode(spec.size);
      while (used.has(code)) code = freshBoardCode(spec.size);
      used.add(code);
      return code;
    });
    clock.reset();
    setNotice('');
    setFeedback('');
    commit(createTournament(players, specs, codes));
    return true;
  }

  function beginTurn(): void {
    clock.reset();
    setNotice('');
    setFeedback('');
    const latest = current.current;
    if (latest) commit(startTurn(latest));
  }

  function activate(index: number): void {
    clock.synchronize();
    const latest = current.current;
    if (!latest) return;
    const next = activateTournamentCard(latest, index);
    const game = next.activeGame;
    if (next !== latest && game && game.selection.kind !== SelectionKind.one) {
      setNotice('');
      const result = isWon(game)
        ? `Pair found. All pairs found in ${game.moves} moves and ${formatElapsed(game.elapsedMs)}.`
        : game.selection.kind === SelectionKind.mismatch
          ? 'No match. Cards close after a short pause.'
          : `Pair found. ${game.matched.length / 2} ${game.matched.length === 2 ? 'pair' : 'pairs'} matched.`;
      setFeedback(result);
      setAnnouncement((value) => value + 1);
    }
    commit(next);
  }

  function continueTurn(): void {
    clock.reset();
    setNotice('');
    setFeedback('');
    const latest = current.current;
    if (latest) commit(nextTurn(latest));
  }

  function continueMatch(): void {
    clock.reset();
    setNotice('');
    setFeedback('');
    const latest = current.current;
    if (latest) commit(nextMatch(latest));
  }

  function load(text: string): TournamentImport | null {
    const loaded = decodeTournament(text);
    if (!loaded) {
      const field = findUnknownTournamentField(text);
      setNotice(field ? `Unknown field: ${field}.` : 'Invalid tournament.');
      setAnnouncement((value) => value + 1);
      return null;
    }
    clock.reset();
    setFeedback('');
    if (loaded.kind === 'setup') {
      setNotice('Loaded tournament setup.');
      setAnnouncement((value) => value + 1);
      commit(null);
    } else {
      setNotice('Loaded tournament.');
      setAnnouncement((value) => value + 1);
      commit(loaded.state, false);
      const record = recordOf(loaded.state);
      if (record) archive(record);
    }
    return loaded;
  }

  function exportCurrent(count: number, names: readonly string[]): string {
    clock.synchronize();
    const source = current.current;
    return source ? encodeTournament(source) : encodeTournamentSetup(count, names);
  }

  function discard(): void {
    clock.reset();
    setNotice('');
    setFeedback('');
    commit(null);
  }

  return {
    tournament,
    history,
    notice,
    feedback,
    announcement,
    storageAvailable,
    begin,
    beginTurn,
    activate,
    continueTurn,
    continueMatch,
    pauseClock: clock.pause,
    resumeClock: clock.resume,
    load,
    exportCurrent,
    discard,
  };
}
