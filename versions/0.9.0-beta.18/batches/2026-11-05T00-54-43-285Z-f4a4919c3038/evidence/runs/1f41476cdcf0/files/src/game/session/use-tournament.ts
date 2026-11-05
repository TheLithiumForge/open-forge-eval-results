import { useRef, useState } from 'react';
import { createGame, isWon } from '../game.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { encodeTournament, decodeTournament } from '../tournament/format.ts';
import {
  createTournament,
  finishTournamentTurn,
  matchPlayers,
  matchWinner,
  nextTournamentTurn,
  playerNameErrors,
  startTournamentTurn,
} from '../tournament/rules.ts';
import { readPastTournaments, savePastTournament } from '../tournament/storage.ts';
import { TournamentPhase } from '../tournament/types.ts';
import { activateSession, initialSession } from './session.ts';
import { browserStore } from './use-saved-preferences.ts';
import { useSessionClock } from './use-session-clock.ts';
import { tournamentDeals } from './tournament-deals.ts';
import type { Tournament, TournamentSetup } from '../tournament/types.ts';
import type { TournamentDocument } from '../tournament/format.ts';
import type { Session } from './session.ts';

export function useTournament(enabled: boolean) {
  const [store] = useState(browserStore);
  const [history, setHistory] = useState(() => readPastTournaments(store));
  const [setup, setSetup] = useState<TournamentSetup>({
    count: 4,
    names: Array.from({ length: 8 }, () => ''),
  });
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState('');
  const [event, setEvent] = useState({ text: '', id: 0 });
  const [session, setSession] = useState(() =>
    initialSession('np1-6-1', { size: 4, bestMoves: {} }),
  );
  const current = useRef(session);
  function commit(next: Session): void {
    current.current = next;
    setSession(next);
  }
  const clock = useSessionClock(
    session,
    current,
    commit,
    enabled && tournament?.phase === TournamentPhase.playing,
  );
  function announce(text: string): void {
    setEvent((event) => ({ text, id: event.id + 1 }));
  }
  function owner(item: Tournament): string {
    const seed = matchPlayers(item, item.matchIndex)[item.turn];
    return seed == null ? '' : (item.players[seed] ?? '');
  }
  function install(document: TournamentDocument): void {
    clock.reset();
    setSetup(document.setup);
    setTournament(document.tournament);
    setErrors([]);
    const code = document.tournament?.matches[document.tournament.matchIndex]?.boardCode;
    if (code)
      commit({
        ...initialSession(code, session.preferences),
        game: document.game ?? createGame(code),
        generation: current.current.generation + 1,
        paused: true,
      });
  }
  function save(item: Tournament): void {
    setHistory(savePastTournament(store, history.items, item));
  }
  function start(): void {
    const names = setup.names.slice(0, setup.count);
    const errors = playerNameErrors(names);
    setErrors(errors);
    if (errors.some(Boolean)) {
      announce(errors.find(Boolean) ?? 'Invalid players.');
      return;
    }
    const item = createTournament(names, tournamentDeals(setup.count));
    install({
      setup: { ...setup, names: setup.names.map((name, index) => item.players[index] ?? name) },
      tournament: item,
      game: null,
    });
    setNotice('');
    announce(`Now playing: ${owner(item)}`);
  }
  function startTurn(): void {
    if (!tournament || (tournament.phase !== TournamentPhase.ready && !session.paused)) return;
    clock.reset();
    setNotice('');
    setTournament(startTournamentTurn(tournament));
    commit({ ...current.current, paused: false });
    announce(`Now playing: ${owner(tournament)}`);
  }
  function activate(index: number): void {
    if (!tournament || tournament.phase !== TournamentPhase.playing) return;
    clock.synchronize();
    const previous = current.current;
    const next = activateSession(previous, index, false);
    commit(next);
    if (next.announcement !== previous.announcement) announce(next.feedback);
    if (!isWon(next.game)) return;
    const item = finishTournamentTurn(tournament, next.game);
    setTournament(item);
    const winner = matchWinner(item, item.matchIndex);
    announce(
      `${owner(item)} finished in ${next.game.moves} moves and ${formatElapsed(next.game.elapsedMs)}. ${winner === null ? 'Next turn.' : `${item.phase === TournamentPhase.complete ? 'Champion' : 'Winner'}: ${item.players[winner]}.`}`,
    );
    if (item.phase === TournamentPhase.complete) save(item);
  }
  function next(): void {
    if (!tournament) return;
    const item = nextTournamentTurn(tournament);
    if (item === tournament) return;
    install({ setup, tournament: item, game: null });
    announce(`Now playing: ${owner(item)}`);
  }
  function reset(): void {
    clock.reset();
    setTournament(null);
    setNotice('');
    announce('');
  }
  function exportJson(): void {
    clock.synchronize();
    setJson(
      encodeTournament({
        setup,
        tournament,
        game: tournament?.phase === TournamentPhase.playing ? current.current.game : null,
      }),
    );
  }
  function load(replace: (action: () => void) => void): void {
    const document = decodeTournament(json);
    if (typeof document === 'string') {
      setNotice(document);
      announce(document);
      return;
    }
    replace(() => {
      install(document);
      if (document.tournament?.phase === TournamentPhase.complete) save(document.tournament);
      const message = document.game
        ? 'Loaded tournament. Select Start turn to continue.'
        : 'Loaded tournament.';
      setNotice(message);
      announce(message);
    });
  }
  function viewPast(item: Tournament): void {
    install({ setup, tournament: item, game: null });
    announce(`Champion: ${item.players[matchWinner(item, item.matchIndex) ?? 0]}`);
  }
  return {
    tournament,
    setup,
    setSetup,
    errors,
    session,
    history,
    json,
    setJson,
    notice,
    event,
    start,
    startTurn,
    activate,
    next,
    reset,
    exportJson,
    load,
    viewPast,
  };
}

export type TournamentController = ReturnType<typeof useTournament>;
