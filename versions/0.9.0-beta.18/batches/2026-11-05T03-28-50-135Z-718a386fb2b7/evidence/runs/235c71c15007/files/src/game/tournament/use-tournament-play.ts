import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { newTournament } from './new-tournament.ts';
import {
  advanceTournamentMatch,
  advanceTournamentTurn,
  currentMatch,
  currentPlayer,
  currentResult,
  type Tournament,
  type TournamentDraft,
  type TournamentResult,
} from './tournament.ts';
import { recordTournamentResult } from './tournament-results.ts';
import type { TournamentFeedback } from './tournament-status.ts';

const EMPTY_DRAFT: TournamentDraft = { playerCount: 4, players: ['', '', '', '', '', '', '', ''] };

export interface TournamentPlayState {
  readonly autoFocusBoard: boolean;
  readonly current: Tournament['current'];
  readonly draft: TournamentDraft;
  readonly gameFeedback: TournamentFeedback;
  readonly gameSnapshot: string | null;
  readonly match: ReturnType<typeof currentMatch>;
  readonly player: Tournament['entrants'][number] | null;
  readonly result: TournamentResult | null;
  readonly saveWhenComplete: boolean;
  readonly setAutoFocusBoard: Dispatch<SetStateAction<boolean>>;
  readonly setDraft: Dispatch<SetStateAction<TournamentDraft>>;
  readonly setGameFeedback: Dispatch<SetStateAction<TournamentFeedback>>;
  readonly setGameSnapshot: Dispatch<SetStateAction<string | null>>;
  readonly setSaveWhenComplete: Dispatch<SetStateAction<boolean>>;
  readonly setStartButtonVisible: Dispatch<SetStateAction<boolean>>;
  readonly setTournament: Dispatch<SetStateAction<Tournament | null>>;
  readonly setTurnStarted: Dispatch<SetStateAction<boolean>>;
  readonly startButtonVisible: boolean;
  readonly tournament: Tournament | null;
  readonly turnStarted: boolean;
  onBoardFocused(): void;
  onComplete(result: TournamentResult): void;
  startTournament(publish: (message: string) => void, clearNotice: () => void): void;
  turnAction(clearNotice: () => void): void;
}

export function useTournamentPlay(): TournamentPlayState {
  const [draft, setDraft] = useState<TournamentDraft>(EMPTY_DRAFT);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [gameSnapshot, setGameSnapshot] = useState<string | null>(null);
  const [turnStarted, setTurnStarted] = useState(false);
  const [startButtonVisible, setStartButtonVisible] = useState(false);
  const [autoFocusBoard, setAutoFocusBoard] = useState(false);
  const [gameFeedback, setGameFeedback] = useState<TournamentFeedback>({ key: '', number: 0, text: '' });
  const [saveWhenComplete, setSaveWhenComplete] = useState(false);

  const current = tournament?.current ?? null;
  const match = tournament ? currentMatch(tournament) : null;
  const player = tournament ? currentPlayer(tournament) : null;
  const result = tournament ? currentResult(tournament) : null;

  function startTournament(publish: (message: string) => void, clearNotice: () => void): void {
    const started = newTournament(draft.players, draft.playerCount);
    if (!('tournament' in started)) {
      publish(started.error);
      return;
    }
    const players = [...draft.players];
    started.names.forEach((name, index) => { players[index] = name; });
    setDraft({ ...draft, players });
    setTournament(started.tournament);
    setGameSnapshot(null);
    setTurnStarted(false);
    setStartButtonVisible(false);
    setAutoFocusBoard(false);
    setSaveWhenComplete(true);
    clearNotice();
    setGameFeedback({ key: '', number: 0, text: '' });
  }

  function startTurn(clearNotice: () => void): void {
    setGameSnapshot(null);
    setTurnStarted(true);
    setStartButtonVisible(true);
    setAutoFocusBoard(true);
    clearNotice();
  }

  function onBoardFocused(): void {
    setAutoFocusBoard(false);
    setStartButtonVisible(false);
  }

  function onComplete(completed: TournamentResult): void {
    setTournament((previous) => previous ? recordTournamentResult(previous, completed) : previous);
  }

  function turnAction(clearNotice: () => void): void {
    if (!tournament) return;
    if (match?.winner) {
      setTournament(advanceTournamentMatch(tournament));
      resetTurnView(clearNotice);
    } else if (current?.turn === 0 && match?.results[0]) {
      setTournament(advanceTournamentTurn(tournament));
      resetTurnView(clearNotice);
    } else if (!turnStarted) startTurn(clearNotice);
  }

  function resetTurnView(clearNotice: () => void): void {
    setGameSnapshot(null);
    setTurnStarted(false);
    setStartButtonVisible(false);
    setAutoFocusBoard(false);
    setGameFeedback({ key: '', number: 0, text: '' });
    clearNotice();
  }

  return {
    autoFocusBoard,
    current,
    draft,
    gameFeedback,
    gameSnapshot,
    match,
    onBoardFocused,
    onComplete,
    player,
    result,
    saveWhenComplete,
    setAutoFocusBoard,
    setDraft,
    setGameFeedback,
    setGameSnapshot,
    setSaveWhenComplete,
    setStartButtonVisible,
    setTournament,
    setTurnStarted,
    startButtonVisible,
    startTournament,
    tournament,
    turnAction,
    turnStarted,
  };
}
