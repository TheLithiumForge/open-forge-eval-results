import { useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { Bracket } from './Bracket.tsx';
import { LeaveTournament } from './LeaveTournament.tsx';
import { PastTournaments } from './PastTournaments.tsx';
import { lastTurn, nextTurn } from './rules.ts';
import { TournamentControl } from './tournament-labels.ts';
import { TournamentExchange } from './TournamentExchange.tsx';
import { TournamentStep } from './use-tournament.ts';
import type { BoardFocus } from '../board/Board.tsx';
import type { TournamentView } from './use-tournament.ts';
import '../controls/control.css';
import './tournament.css';

interface TournamentBodyProps {
  view: TournamentView;
  leave(): void;
}

// The part of the screen below the status line. The exchange tools stay last, so their draft
// survives every step.
export function TournamentBody({ view, leave }: TournamentBodyProps) {
  const board = useRef<BoardFocus>(null);
  const { step, tournament, play } = view;
  const unfinished = step !== TournamentStep.setup && step !== TournamentStep.finished;
  const sameMatch = lastTurn(tournament)?.match === nextTurn(tournament)?.match;
  return (
    <>
      {play && (
        <Board key={play.generation} game={play.game} activate={view.activate} ref={board} />
      )}
      {unfinished && (
        <div className="tournament-actions turn-actions">
          {step === TournamentStep.ready && (
            <button type="button" className="control" onClick={view.startTurn}>
              {TournamentControl.startTurn}
            </button>
          )}
          {step === TournamentStep.review && (
            <button type="button" className="control" onClick={view.next}>
              {sameMatch ? TournamentControl.nextTurn : TournamentControl.nextMatch}
            </button>
          )}
          <LeaveTournament leave={leave} />
        </div>
      )}
      {step !== TournamentStep.setup && <Bracket tournament={tournament} />}
      {(step === TournamentStep.setup || step === TournamentStep.finished) && (
        <PastTournaments records={view.past.records} blocked={view.past.blocked} />
      )}
      <TournamentExchange exportTournament={view.exportTournament} load={view.load} />
    </>
  );
}
