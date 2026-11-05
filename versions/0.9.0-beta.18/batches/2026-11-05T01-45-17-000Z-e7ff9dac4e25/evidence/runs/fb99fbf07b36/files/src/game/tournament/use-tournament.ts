import { useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { activateSession } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import { DecodeKind, decodeTournament, encodeDraft, encodeTournament } from './exchange.ts';
import {
  createTournament,
  drawBoardCodes,
  isFinished,
  recordedTurns,
  recordResult,
  resultOf,
  turnAt,
} from './rules.ts';
import { TournamentNotice } from './tournament-labels.ts';
import { beginTurn, clearTurn, idleTurn, noticeTurn, resetTurn } from './turn-session.ts';
import { turnView } from './view.ts';
import type { Session } from '../session/session.ts';
import type { Records } from './use-tournament-records.ts';
import type { Tournament } from './types.ts';

interface Model {
  readonly tournament: Tournament | undefined;
  // True while a game exists for the turn on screen, whether it is under way or finished.
  readonly active: boolean;
}

export function useTournament(records: Records) {
  const [model, setModelState] = useState<Model>({ tournament: undefined, active: false });
  const latest = useRef(model);
  const [session, setSession] = useState(idleTurn);
  const current = useRef(session);

  function setModel(next: Model): void {
    latest.current = next;
    setModelState(next);
  }

  function commit(next: Session): void {
    if (next === current.current) return;
    current.current = next;
    setSession(next);
  }

  const clock = useSessionClock(session, current, commit);

  function notice(text: string): void {
    commit(noticeTurn(current.current, text));
  }

  function startTournament(names: readonly string[]): void {
    const codes = drawBoardCodes(names.length, (size) => freshBoardCode(size));
    clock.reset();
    commit(resetTurn(current.current));
    setModel({ tournament: createTournament(names, codes), active: false });
  }

  function startTurn(): void {
    const { tournament } = latest.current;
    const turn = tournament && turnAt(tournament, recordedTurns(tournament));
    const code = turn && tournament.matches[turn.match]?.boardCode;
    if (!tournament || !code) return;
    clock.reset();
    commit(beginTurn(current.current, code));
    setModel({ tournament, active: true });
  }

  // A finished game is recorded the moment it ends, so the bracket never waits on a button.
  function activate(index: number): void {
    clock.synchronize();
    const before = current.current;
    const after = activateSession(before, index, false);
    commit(after);
    const { tournament } = latest.current;
    if (!tournament || isWon(before.game) || !isWon(after.game)) return;
    const next = recordResult(tournament, resultOf(after.game));
    setModel({ tournament: next, active: true });
    if (isFinished(next)) records.add(next);
  }

  // Next turn and Next match both leave the finished game and wait for Start turn.
  function nextStep(): void {
    clock.reset();
    commit(clearTurn(current.current));
    setModel({ ...latest.current, active: false });
  }

  function leave(): void {
    clock.reset();
    commit(resetTurn(current.current));
    setModel({ tournament: undefined, active: false });
  }

  function exportText(draft: readonly string[]): string {
    const { tournament } = latest.current;
    return tournament ? encodeTournament(tournament) : encodeDraft(draft);
  }

  // Returns the entry list when the text was a tournament that hadn't started.
  function load(text: string): readonly string[] | undefined {
    const decoded = decodeTournament(text);
    if (decoded.kind === DecodeKind.error) {
      notice(decoded.message);
      return undefined;
    }
    clock.reset();
    const fresh = resetTurn(current.current);
    if (decoded.kind === DecodeKind.draft) {
      commit(noticeTurn(fresh, TournamentNotice.loadedPlayers));
      setModel({ tournament: undefined, active: false });
      return decoded.players;
    }
    const done = isFinished(decoded.tournament);
    commit(noticeTurn(fresh, done ? TournamentNotice.loadedCompleted : TournamentNotice.loaded));
    setModel({ tournament: decoded.tournament, active: false });
    return undefined;
  }

  const view = turnView(model.tournament, model.active, isWon(session.game));
  return {
    ...model,
    session,
    view,
    notice,
    startTournament,
    startTurn,
    activate,
    nextStep,
    leave,
    exportText,
    load,
  };
}
