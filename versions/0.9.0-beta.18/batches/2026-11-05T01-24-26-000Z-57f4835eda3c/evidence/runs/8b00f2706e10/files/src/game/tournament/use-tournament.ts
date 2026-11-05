import { useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { decodeTournament, encodeTournament } from './exchange.ts';
import { nameProblem } from './names.ts';
import {
  champion,
  createTournament,
  currentTurn,
  isFinished,
  matchSeeds,
  playerName,
  recordResult,
} from './rules.ts';
import { nowPlaying } from './tournament-labels.ts';
import { FocusTarget, useFocusRequest } from './use-focus-request.ts';
import { usePastTournaments } from './use-past-tournaments.ts';
import { useSetupDrafts } from './use-setup-drafts.ts';
import type { RefObject } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { GameState } from '../game.ts';
import type { Session } from '../session/session.ts';
import type { Tournament } from './rules.ts';

export const TurnPhase = { ready: 'ready', playing: 'playing', ended: 'ended' } as const;
export const LeaveKind = { game: 'game', tournament: 'tournament' } as const;

interface GameController {
  readonly session: Session;
  newGame(size?: number): void;
  activate(index: number): GameState;
  startCompetition(code: string, feedback: string): void;
  announce(feedback: string): void;
}
interface TournamentScreen {
  readonly open: boolean;
  // Null while the players are being entered.
  readonly tournament: Tournament | null;
  readonly phase: (typeof TurnPhase)[keyof typeof TurnPhase];
  // The match whose round, players and board are on screen.
  readonly match: number;
  readonly notice: string;
  readonly leaving: (typeof LeaveKind)[keyof typeof LeaveKind] | null;
}
const CLOSED: TournamentScreen = {
  open: false,
  tournament: null,
  phase: TurnPhase.ready,
  match: 0,
  notice: '',
  leaving: null,
};

function drawCode(size: number): string {
  return freshBoardCode(size);
}

// Runs the Tournament screen around the ordinary session. Its games use the session's
// competition mode, so they never change the saved size or best scores.
export function useTournament(controller: GameController, board: RefObject<BoardFocus | null>) {
  const [screen, setScreen] = useState(CLOSED);
  const current = useRef(screen);
  const focus = useFocusRequest(board);
  const setup = useSetupDrafts();
  const { past, save } = usePastTournaments();

  function update(change: Partial<TournamentScreen>): void {
    current.current = { ...current.current, ...change };
    setScreen(current.current);
  }
  function notice(text: string): void {
    update({ notice: text });
    controller.announce(text);
  }
  // Hands the device over: a fresh game of the match's deal waits for Start turn.
  function ready(tournament: Tournament): void {
    const turn = currentTurn(tournament);
    if (!turn) return;
    const seed = matchSeeds(tournament, turn.match)?.[turn.seat] ?? 0;
    const code = tournament.matches[turn.match]?.boardCode ?? '';
    controller.startCompetition(code, nowPlaying(playerName(tournament, seed)));
    update({ tournament, phase: TurnPhase.ready, match: turn.match, notice: '' });
  }
  // Opening the screen leaves the ordinary game, so returning starts from a fresh deal.
  function open(): void {
    controller.newGame();
    update({ ...CLOSED, open: true });
    focus.request(FocusTarget.heading);
  }
  function close(): void {
    const { competition, preferences } = controller.session;
    if (competition) controller.newGame(preferences.size);
    update(CLOSED);
    focus.request(FocusTarget.tournament);
  }
  function activate(index: number): void {
    const game = controller.activate(index);
    const { tournament, phase, match } = current.current;
    if (!tournament || phase !== TurnPhase.playing || !isWon(game)) return;
    if (tournament.matches[match]?.boardCode !== game.boardCode) return;
    const next = recordResult(tournament, { elapsedMs: game.elapsedMs, moves: game.moves });
    update({ tournament: next, phase: TurnPhase.ended });
    if (isFinished(next)) save(next);
  }
  function load(text: string): boolean {
    const result = decodeTournament(text);
    if ('problem' in result) {
      notice(result.problem);
      return false;
    }
    const { tournament } = result;
    const last = tournament.matches.length - 1;
    if (!isFinished(tournament)) ready(tournament);
    else {
      // The live region announces the champion. The final's deal waits unstarted and hidden.
      controller.startCompetition(tournament.matches[last]?.boardCode ?? '', '');
      update({ tournament, phase: TurnPhase.ready, match: last, notice: '' });
    }
    focus.request(FocusTarget.heading);
    return true;
  }

  const { tournament } = screen;
  return {
    ...screen,
    setup,
    past,
    refs: focus.refs,
    champion: tournament && isFinished(tournament) ? champion(tournament) : null,
    enter(): void {
      const { game } = controller.session;
      if (game.started && !isWon(game)) update({ leaving: LeaveKind.game });
      else open();
    },
    start(): void {
      const names = setup.names();
      const problem = nameProblem(names);
      if (problem) return controller.announce(problem);
      ready(createTournament(names, drawCode));
      focus.request(FocusTarget.heading);
    },
    startTurn(): void {
      update({ phase: TurnPhase.playing });
      focus.request(FocusTarget.board);
    },
    activate,
    next(): void {
      if (current.current.tournament) ready(current.current.tournament);
      focus.request(FocusTarget.startTurn);
    },
    // On the setup screen, export writes a new tournament with fresh deals for the entered players.
    exportText(): string | null {
      if (current.current.tournament) return encodeTournament(current.current.tournament);
      const names = setup.names();
      const problem = nameProblem(names);
      if (!problem) return encodeTournament(createTournament(names, drawCode));
      notice(problem);
      return null;
    },
    load,
    requestLeave: () => update({ leaving: LeaveKind.tournament }),
    keep(): void {
      const { leaving } = current.current;
      update({ leaving: null });
      focus.request(leaving === LeaveKind.game ? FocusTarget.tournament : FocusTarget.leave);
    },
    leave: () => (current.current.leaving === LeaveKind.game ? open() : close()),
    back: close,
  };
}

export type TournamentController = ReturnType<typeof useTournament>;
