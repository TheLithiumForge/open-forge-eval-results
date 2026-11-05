import { useRef, useState } from 'react';
import { activateCard, createGame, isWon } from './game.ts';
import { decodeTournament, encodeTournament } from './tournament-format.ts';
import {
  advanceTournament,
  advanceTournamentTurn,
  createTournament,
  currentTournamentMatch,
  recordTournamentResult,
  resultForGame,
} from './tournament.ts';
import { readPastTournaments, writePastTournaments } from './tournament-storage.ts';
import { browserStore } from './session/use-saved-preferences.ts';
import { initialSession, replaceGame } from './session/session.ts';
import { useSessionClock } from './session/use-session-clock.ts';
import { freshBoardCode } from './session/fresh-board.ts';
import type { Session } from './session/session.ts';
import type { Tournament, TournamentDraft } from './tournament.ts';

interface TournamentController {
  readonly draft: TournamentDraft;
  readonly tournament: Tournament | null;
  readonly session: Session;
  readonly past: readonly Tournament[];
  readonly json: string;
  readonly notice: string;
  readonly turnReady: boolean;
  setPlayerCount(count: 4 | 8): void;
  setName(index: number, name: string): void;
  setJson(value: string): void;
  start(): void;
  startTurn(): void;
  activate(index: number): void;
  nextTurn(): void;
  nextMatch(): void;
  exportTournament(): void;
  loadTournament(): void;
}

export function useTournament(size: number, boardCode: string): TournamentController {
  const [store] = useState(browserStore);
  const [draft, setDraft] = useState<TournamentDraft>({
    playerCount: 4,
    names: ['', '', '', ''],
  });
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [past, setPast] = useState(() => readPastTournaments(store));
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState('');
  const [turnReady, setTurnReady] = useState(false);
  const [session, setSession] = useState(() => initialSession(boardCode, { size, bestMoves: {} }));
  const current = useRef(session);
  function commit(next: Session): void {
    if (next === current.current) return;
    current.current = next;
    setSession(next);
  }
  const clock = useSessionClock(session, current, commit);

  function prepareTurn(code: string): void {
    clock.reset();
    commit(replaceGame(current.current, createGame(code), false));
    setTurnReady(false);
  }

  function setPlayerCount(count: 4 | 8): void {
    setDraft((previous) => ({
      playerCount: count,
      names: Array.from({ length: count }, (_, index) => previous.names[index] ?? ''),
    }));
  }

  function setName(index: number, name: string): void {
    setDraft((previous) => ({
      ...previous,
      names: previous.names.map((currentName, currentIndex) =>
        currentIndex === index ? name : currentName,
      ),
    }));
  }

  function start(): void {
    if (tournament) return;
    const names = draft.names.slice(0, draft.playerCount).map((name) => name.trim());
    if (names.some((name) => name.length === 0 || name.length > 60)) {
      setNotice('Enter a name of 1 to 60 characters for every player.');
      return;
    }
    const started = createTournament(names, size, crypto.randomUUID(), Date.now(), freshBoardCode);
    setDraft({ playerCount: draft.playerCount, names });
    setTournament(started);
    setNotice('');
    prepareTurn(currentTournamentMatch(started).boardCode);
  }

  function activate(index: number): void {
    clock.synchronize();
    const previous = current.current;
    const game = activateCard(previous.game, index);
    if (game === previous.game) return;
    commit({ ...previous, game });
    if (isWon(game)) {
      setTournament((active) =>
        active ? recordTournamentResult(active, resultForGame(game)) : active,
      );
    }
  }

  function nextTurn(): void {
    if (!tournament) return;
    const next = advanceTournamentTurn(tournament);
    if (next === tournament) return;
    setTournament(next);
    prepareTurn(currentTournamentMatch(next).boardCode);
  }

  function nextMatch(): void {
    if (!tournament) return;
    const next = advanceTournament(tournament, Date.now());
    if (next === tournament) return;
    setTournament(next);
    if (next.status === 'complete') {
      const nextPast = [next, ...past.filter((item) => item.id !== next.id)];
      setPast(nextPast);
      writePastTournaments(store, nextPast);
      return;
    }
    prepareTurn(currentTournamentMatch(next).boardCode);
  }

  function exportTournament(): void {
    setJson(
      encodeTournament(draft, tournament, tournament?.status === 'active' ? session.game : null),
    );
  }

  function loadTournament(): void {
    const loaded = decodeTournament(json);
    if (!loaded) {
      setNotice('Invalid tournament JSON.');
      return;
    }
    setDraft(loaded.draft);
    setTournament(loaded.tournament);
    setTurnReady(Boolean(loaded.game?.started || (loaded.game && isWon(loaded.game))));
    if (loaded.game) {
      clock.reset();
      commit({
        ...current.current,
        game: loaded.game,
        paused: false,
        generation: current.current.generation + 1,
        feedback: '',
        loadNotice: '',
        announcement: current.current.announcement + 1,
        celebration: false,
      });
    }
    if (loaded.tournament?.status === 'complete') {
      const nextPast = [
        loaded.tournament,
        ...past.filter((item) => item.id !== loaded.tournament?.id),
      ];
      setPast(nextPast);
      writePastTournaments(store, nextPast);
    }
    setNotice('Tournament loaded.');
  }

  return {
    draft,
    tournament,
    session,
    past,
    json,
    notice,
    turnReady,
    setPlayerCount,
    setName,
    setJson,
    start,
    startTurn: () => setTurnReady(true),
    activate,
    nextTurn,
    nextMatch,
    exportTournament,
    loadTournament,
  };
}
