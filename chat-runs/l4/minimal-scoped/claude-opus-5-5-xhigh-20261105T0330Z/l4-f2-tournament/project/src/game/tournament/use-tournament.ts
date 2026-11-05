import { useRef, useState } from 'react';
import { freshBoardCode } from '../session/fresh-board.ts';
import { browserStore } from '../session/use-saved-preferences.ts';
import { decodeTournament, encodeTournament, TournamentLoad } from './format.ts';
import { readTournaments, saveTournament } from './records.ts';
import {
  acceptedName,
  champion,
  createTournament,
  currentTurn,
  nameProblem,
  recordResult,
} from './rules.ts';
import type { GameState } from '../game.ts';
import type { Tournament, Turn } from './rules.ts';

export const TurnPhase = { ready: 'ready', playing: 'playing', done: 'done' } as const;
type Phase = (typeof TurnPhase)[keyof typeof TurnPhase];
export const NO_EXPORT = 'There is no tournament to export.';

interface Flow {
  readonly tournament: Tournament | null;
  // The turn on screen, kept after its game ends until Next turn or Next match.
  readonly shown: Turn | null;
  readonly phase: Phase;
  readonly turnKey: number;
  // Changes when the screen changes, so its heading takes focus.
  readonly screen: number;
}
const IDLE: Flow = { tournament: null, shown: null, phase: TurnPhase.ready, turnKey: 0, screen: 0 };

function freshDeal(size: number): string {
  return freshBoardCode(size);
}

function nowPlaying(tournament: Tournament, turn: Turn): string {
  const match = tournament.rounds[turn.round]?.[turn.match];
  return `Now playing: ${tournament.players[match?.players[turn.player] ?? -1] ?? ''}`;
}

// Runs a tournament beside the solo game. Its turns never touch the solo session or its saved
// preferences, and only finished tournaments reach browser storage.
export function useTournament() {
  const [store] = useState(browserStore);
  const [saved, setSaved] = useState(() => readTournaments(store));
  const [flow, setFlow] = useState(IDLE);
  const [result, setResult] = useState({ feedback: '', announcement: 0 });
  const [notice, setNotice] = useState('');
  const current = useRef(flow);
  const savedNow = useRef(saved);

  function commit(next: Flow): void {
    current.current = next;
    setFlow(next);
  }

  function publish(feedback: string): void {
    setResult((previous) => ({ feedback, announcement: previous.announcement + 1 }));
  }

  // Shows the next turn of a tournament, or its champion once the final has a winner.
  function present(tournament: Tournament): void {
    const shown = currentTurn(tournament);
    const before = current.current;
    commit({ ...before, tournament, shown, phase: TurnPhase.ready, screen: before.screen + 1 });
    if (shown) publish(nowPlaying(tournament, shown));
  }

  function start(drafts: readonly string[]): void {
    const players = drafts.map(acceptedName);
    const problem = nameProblem(players);
    if (problem) return publish(problem);
    setNotice('');
    present(createTournament(players, freshDeal));
  }

  function startTurn(): void {
    const before = current.current;
    setNotice('');
    commit({ ...before, phase: TurnPhase.playing, turnKey: before.turnKey + 1 });
  }

  function finish(game: GameState): void {
    const before = current.current;
    if (!before.tournament || before.phase !== TurnPhase.playing) return;
    const attempt = { moves: game.moves, elapsedMs: game.elapsedMs };
    const tournament = recordResult(before.tournament, attempt, freshDeal);
    if (champion(tournament) === null)
      return commit({ ...before, tournament, phase: TurnPhase.done });
    // The champion's screen follows at once, and the finished tournament joins the records.
    savedNow.current = saveTournament(store, savedNow.current, tournament);
    setSaved(savedNow.current);
    commit({
      ...before,
      tournament,
      shown: null,
      phase: TurnPhase.ready,
      screen: before.screen + 1,
    });
  }

  function next(): void {
    const before = current.current;
    const { tournament, shown } = before;
    const upcoming = tournament && currentTurn(tournament);
    if (!tournament || !shown || !upcoming) return;
    const sameMatch = upcoming.round === shown.round && upcoming.match === shown.match;
    setNotice('');
    commit({
      ...before,
      shown: upcoming,
      phase: TurnPhase.ready,
      screen: before.screen + (sameMatch ? 0 : 1),
    });
    publish(nowPlaying(tournament, upcoming));
  }

  // Ends the tournament on screen. An unfinished one is gone; a finished one stays in the records.
  function close(): void {
    const before = current.current;
    commit({ ...IDLE, turnKey: before.turnKey, screen: before.screen + 1 });
    setResult((previous) => ({ feedback: '', announcement: previous.announcement }));
    setNotice('');
  }

  function exportTournament(): string | null {
    const tournament = current.current.tournament;
    if (tournament) return encodeTournament(tournament);
    setNotice(NO_EXPORT);
    publish(NO_EXPORT);
    return null;
  }

  // Checks the draft without replacing the tournament on screen.
  function readDraft(text: string): Tournament | null {
    const loaded = decodeTournament(text);
    if (typeof loaded !== 'string') return loaded;
    setNotice(loaded);
    publish(loaded);
    return null;
  }

  // Loading never adds to the records: only a tournament finished here is saved.
  function load(tournament: Tournament): void {
    setNotice(TournamentLoad.loaded);
    present(tournament);
    if (!currentTurn(tournament)) publish(TournamentLoad.loaded);
  }

  const unfinished = flow.tournament !== null && champion(flow.tournament) === null;
  return {
    ...flow,
    ...result,
    saved,
    notice,
    unfinished,
    start,
    startTurn,
    publish,
    finish,
    next,
    close,
    exportTournament,
    readDraft,
    load,
  };
}

export type TournamentFlow = ReturnType<typeof useTournament>;
