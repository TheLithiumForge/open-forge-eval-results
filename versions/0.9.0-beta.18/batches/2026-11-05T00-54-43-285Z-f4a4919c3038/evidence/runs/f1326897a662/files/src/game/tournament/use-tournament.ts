import { useRef, useState } from 'react';
import { freshBoardCode } from '../session/fresh-board.ts';
import { browserStore } from '../session/use-saved-preferences.ts';
import { normalizeName, nameErrors } from './names.ts';
import { readTournaments, saveTournament } from './storage.ts';
import {
  advanceTournament,
  beginTurn,
  createTournament,
  currentPlayer,
  finishTurn,
  matchWinner,
  roundForMatch,
  TournamentPhase,
} from './rules.ts';
import type { TournamentState } from './rules.ts';
import type { TournamentDocument, TournamentSetup } from './format.ts';
import type { GameState } from '../game.ts';

export function useTournament(announce: (message: string) => void) {
  const [open, setOpen] = useState(false);
  const [setup, setSetup] = useState<TournamentSetup>({
    count: 4,
    names: Array.from({ length: 8 }, () => ''),
  });
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const current = useRef(tournament);
  const [store] = useState(browserStore);
  const [history, setHistory] = useState(() => readTournaments(store));
  const saved = useRef(history);

  function remember(next: TournamentState): void {
    const history = saveTournament(store, saved.current.items, next);
    saved.current = history;
    setHistory(history);
  }

  function commit(next: TournamentState | null): void {
    current.current = next;
    setTournament(next);
  }

  function publishTurn(next: TournamentState): void {
    announce(
      `Round: ${roundForMatch(next.players.length, next.currentMatch).name}. Now playing: ${currentPlayer(next)}`,
    );
  }

  function showSetup(next: TournamentState): void {
    setSetup({
      count: next.players.length === 8 ? 8 : 4,
      names: Array.from({ length: 8 }, (_, index) => next.players[index] ?? ''),
    });
  }

  function start(): void {
    const names = setup.names.slice(0, setup.count).map(normalizeName);
    const errors = nameErrors(names);
    setErrors(errors);
    if (errors.some(Boolean)) {
      announce(errors.find(Boolean) ?? 'Invalid names.');
      return;
    }
    const codes: string[] = [];
    for (let index = 0; index < names.length - 1; index += 1) {
      let code: string;
      do {
        code = freshBoardCode(roundForMatch(names.length, index).size);
      } while (codes.includes(code));
      codes.push(code);
    }
    const next = createTournament(names, codes);
    showSetup(next);
    commit(next);
    publishTurn(next);
  }

  function begin(): string | null {
    const previous = current.current;
    if (!previous || previous.phase !== TournamentPhase.ready) return null;
    const next = beginTurn(previous);
    commit(next);
    publishTurn(next);
    return next.matches[next.currentMatch]?.boardCode ?? null;
  }

  function finish(game: GameState): TournamentState | null {
    const previous = current.current;
    if (!previous) return null;
    const next = finishTurn(previous, game);
    if (next === previous) return null;
    commit(next);
    if (next.phase === TournamentPhase.completed) remember(next);
    return next;
  }

  function advance(): void {
    if (!current.current) return;
    const next = advanceTournament(current.current);
    commit(next);
    publishTurn(next);
  }

  function load(document: TournamentDocument): void {
    setSetup(document.setup);
    setErrors([]);
    commit(document.tournament);
    if (document.tournament?.phase === TournamentPhase.completed) remember(document.tournament);
    if (document.tournament && document.tournament.phase !== TournamentPhase.completed) {
      const next = document.tournament;
      announce(
        `Loaded tournament. Round: ${roundForMatch(next.players.length, next.currentMatch).name}. Now playing: ${currentPlayer(next)}`,
      );
    } else announce('Loaded tournament.');
  }

  function view(item: TournamentState): void {
    showSetup(item);
    commit(item);
    announce(`Champion: ${item.players[(matchWinner(item, item.matches.length - 1) ?? 1) - 1]}`);
  }

  function leave(): void {
    commit(null);
    setOpen(false);
  }

  return {
    open,
    setup,
    setSetup,
    errors,
    tournament,
    history,
    start,
    begin,
    finish,
    advance,
    load,
    view,
    enter: () => setOpen(true),
    leave,
  };
}
