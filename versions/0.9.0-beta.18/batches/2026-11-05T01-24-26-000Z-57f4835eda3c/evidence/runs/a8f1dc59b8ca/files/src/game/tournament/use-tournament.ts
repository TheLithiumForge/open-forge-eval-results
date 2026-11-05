import { useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { browserStore } from '../session/use-saved-preferences.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import { loadedText, nowPlaying, TournamentText, unknownFieldText } from './labels.ts';
import {
  championOf,
  checkNames,
  createTournament,
  currentTurn,
  recordResult,
  turnPlayer,
} from './rules.ts';
import { readPastTournaments, saveTournament } from './storage.ts';
import { FocusTarget, useScreenFocus } from './use-screen-focus.ts';
import type { Session } from '../session/session.ts';
import type { Tournament } from './rules.ts';
import type { SavedTournaments } from './storage.ts';

// A turn waits for Start turn, then plays its board, then shows the result until the next turn.
export const TurnStage = { ready: 'ready', playing: 'playing', done: 'done' } as const;
type Stage = (typeof TurnStage)[keyof typeof TurnStage];

interface GameController {
  readonly session: Session;
  activate(index: number): Session;
  setCompetition(competition: boolean): void;
  deal(code: string): void;
  publish(feedback: string): void;
}

interface TournamentState {
  readonly open: boolean;
  readonly tournament: Tournament | null;
  readonly stage: Stage;
  readonly invalidEntry: number | null;
  // The question in the leave dialog while it is open.
  readonly leaving: string | null;
  readonly past: SavedTournaments;
}

export function useTournament(controller: GameController) {
  const [store] = useState(browserStore);
  const [state, setState] = useState<TournamentState>(() => ({
    open: false,
    tournament: null,
    stage: TurnStage.ready,
    invalidEntry: null,
    leaving: null,
    past: readPastTournaments(store),
  }));
  const current = useRef(state);
  const leaveAction = useRef<(() => void) | null>(null);
  const focus = useScreenFocus();

  function commit(change: Partial<TournamentState>): void {
    current.current = { ...current.current, ...change };
    setState(current.current);
  }

  // Leaving unfinished work asks first. Finished or unstarted work is left at once.
  function confirm(unfinished: boolean, question: string, leave: () => void): void {
    if (!unfinished) return leave();
    leaveAction.current = leave;
    commit({ leaving: question });
  }

  function keepPlaying(): void {
    leaveAction.current = null;
    commit({ leaving: null });
  }

  function confirmLeave(): void {
    const leave = leaveAction.current;
    keepPlaying();
    leave?.();
  }

  function isUnfinished(): boolean {
    const { tournament } = current.current;
    return tournament !== null && championOf(tournament) === null;
  }

  function openScreen(): void {
    const { game } = controller.session;
    confirm(game.started && !isWon(game), TournamentText.leaveGame, () => {
      controller.setCompetition(true);
      commit({ open: true, tournament: null, stage: TurnStage.ready, invalidEntry: null });
      focus.request(FocusTarget.tournamentHeading);
    });
  }

  function close(): void {
    controller.setCompetition(false);
    commit({ open: false, tournament: null, stage: TurnStage.ready, invalidEntry: null });
    focus.request(FocusTarget.gameHeading);
  }

  function leave(): void {
    confirm(isUnfinished(), TournamentText.leaveTournament, close);
  }

  function begin(tournament: Tournament, feedback: string): void {
    commit({ tournament, stage: TurnStage.ready, invalidEntry: null });
    controller.publish(feedback);
  }

  function start(drafts: readonly string[]): void {
    const checked = checkNames(drafts);
    if ('notice' in checked) {
      commit({ invalidEntry: checked.index });
      controller.publish(checked.notice);
      return;
    }
    const tournament = createTournament(checked.names, (size) => freshBoardCode(size));
    begin(tournament, nowPlaying(turnPlayer(tournament) ?? ''));
    focus.request(FocusTarget.tournamentHeading);
  }

  function startTurn(): void {
    const { tournament } = current.current;
    const turn = tournament && currentTurn(tournament);
    const match = turn && tournament.matches[turn.match];
    if (!match) return;
    controller.deal(match.boardCode);
    commit({ stage: TurnStage.playing });
    focus.request(FocusTarget.board);
  }

  // The winning activation records the player's moves and exact active time.
  function activate(index: number): void {
    const { game } = controller.activate(index);
    const { tournament, stage, past } = current.current;
    if (!tournament || stage !== TurnStage.playing || !isWon(game)) return;
    const next = recordResult(tournament, { moves: game.moves, elapsedMs: game.elapsedMs });
    const finished = championOf(next) !== null;
    commit({
      tournament: next,
      stage: TurnStage.done,
      past: finished ? saveTournament(store, past, next) : past,
    });
    focus.request(FocusTarget.action);
  }

  function nextTurn(): void {
    const { tournament } = current.current;
    const player = tournament && turnPlayer(tournament);
    if (!player) return;
    commit({ stage: TurnStage.ready });
    controller.publish(nowPlaying(player));
    focus.request(FocusTarget.action);
  }

  function exportTournament(): string | null {
    const { tournament } = current.current;
    if (tournament) return encodeTournament(tournament);
    controller.publish(TournamentText.nothingToExport);
    return null;
  }

  // Validates the whole draft before asking to leave or replacing the tournament.
  function load(text: string): void {
    const decoded = decodeTournament(text);
    if (!decoded || 'unknownField' in decoded) {
      controller.publish(decoded ? unknownFieldText(decoded.unknownField) : TournamentText.invalid);
      return;
    }
    confirm(isUnfinished(), TournamentText.replaceTournament, () => {
      const player = turnPlayer(decoded.tournament);
      controller.setCompetition(true);
      begin(decoded.tournament, player ? loadedText(player) : TournamentText.loadedCompleted);
    });
  }

  return {
    state,
    focus,
    openScreen,
    close,
    leave,
    start,
    startTurn,
    activate,
    nextTurn,
    exportTournament,
    load,
    keepPlaying,
    confirmLeave,
  };
}
