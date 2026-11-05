import { useCallback, useEffect, useRef, useState } from 'react';
import { parseBoardCode } from '../deck.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { browserStore } from '../session/use-saved-preferences.ts';
import {
  champion,
  isPlayerCount,
  matchWinner,
  nextTurn,
  RosterProblem,
  rosterProblem,
  turnPlayer,
} from './bracket.ts';
import { decodeTournament, encodeTournament } from './tournament-format.ts';
import {
  advance,
  beginTurn,
  draftNames,
  editDraft,
  finishTurn,
  loadFlow,
  savedFlow,
  setupFlow,
  startTournament,
} from './tournament-flow.ts';
import { matchOverNotice, TournamentNotice, turnOverNotice } from './tournament-labels.ts';
import {
  readPastTournaments,
  rememberTournament,
  writePastTournaments,
} from './tournament-storage.ts';
import type { GameState } from '../game.ts';
import type { TournamentFlow } from './tournament-flow.ts';
import type { TurnProgress } from './TurnGame.tsx';

export function useTournament(size: number) {
  const [store] = useState(browserStore);
  const [past, setPast] = useState(() => readPastTournaments(store));
  const [flow, setFlow] = useState(setupFlow);
  const current = useRef(flow);
  const [notice, setNotice] = useState({ text: '', announcement: 0 });
  const turnGame = useRef<TurnProgress>(null);
  // Each step of play moves focus to the control that continues it. Loads keep focus in place.
  const action = useRef<HTMLElement | null>(null);
  const focusTarget = useCallback((element: HTMLElement | null) => {
    action.current = element;
  }, []);
  const pendingFocus = useRef(false);
  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    action.current?.focus();
  });

  function update(next: TournamentFlow, focus = false): void {
    current.current = next;
    pendingFocus.current = focus;
    setFlow(next);
  }

  function announce(text: string): void {
    setNotice((previous) => ({ text, announcement: previous.announcement + 1 }));
  }

  // A cleared notice has nothing to announce.
  function quiet(): void {
    setNotice((previous) => ({ ...previous, text: '' }));
  }

  function chooseCount(count: number): void {
    if (isPlayerCount(count)) update({ ...current.current, count });
  }

  function editName(index: number, name: string): void {
    update(editDraft(current.current, index, name));
  }

  // Returns the first name slot to correct, or null when the tournament starts.
  function start(): number | null {
    const names = draftNames(current.current);
    const problem = rosterProblem(names);
    if (problem) {
      announce(
        problem.kind === RosterProblem.missing
          ? TournamentNotice.missingName
          : TournamentNotice.duplicateName,
      );
      return problem.index;
    }
    const codes: string[] = [];
    while (codes.length < names.length - 1)
      codes.push(freshBoardCode(size, parseBoardCode(codes.at(-1) ?? '')?.seed));
    update(startTournament(current.current, codes), true);
    quiet();
    return null;
  }

  function startTurn(): void {
    update(beginTurn(current.current));
    quiet();
  }

  function finish(game: GameState): void {
    const turn = current.current.tournament && nextTurn(current.current.tournament);
    const next = finishTurn(current.current, game);
    const { tournament } = next;
    if (!turn || !tournament || next === current.current) return;
    update(next, true);
    const name = (player: number | null) =>
      player === null ? '' : (tournament.players[player] ?? '');
    const following = nextTurn(tournament);
    announce(
      turn.seat === 0 && following
        ? turnOverNotice(
            name(turnPlayer(tournament, turn)),
            name(turnPlayer(tournament, following)),
          )
        : matchOverNotice(name(matchWinner(tournament, turn.match)), turn.match),
    );
    if (champion(tournament) === null) return;
    const list = rememberTournament(past, tournament);
    setPast(list);
    writePastTournaments(store, list);
  }

  function nextStep(): void {
    update(advance(current.current), true);
    quiet();
  }

  function exportText(): string {
    return encodeTournament(savedFlow(current.current, turnGame.current?.progress() ?? null));
  }

  function load(text: string): void {
    const saved = decodeTournament(text);
    if (saved) update(loadFlow(current.current, saved));
    announce(saved ? TournamentNotice.loaded : TournamentNotice.invalid);
  }

  return {
    flow,
    past,
    notice,
    focusTarget,
    turnGame,
    chooseCount,
    editName,
    start,
    startTurn,
    finish,
    nextStep,
    exportText,
    load,
  };
}
