import { Board } from '../board/Board.tsx';
import { Bracket } from './Bracket.tsx';
import { PastTournamentsTable } from './PastTournamentsTable.tsx';
import { TournamentExchange } from './TournamentExchange.tsx';
import { currentTurn, isFinished } from './rules.ts';
import { TournamentControl } from './tournament-labels.ts';
import { TurnPhase } from './use-tournament.ts';
import type { RefObject } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { GameState } from '../game.ts';
import type { TournamentController } from './use-tournament.ts';
import '../controls/control.css';
import './tournament.css';

interface TournamentPlayProps {
  screen: TournamentController;
  game: GameState;
  generation: number;
  board: RefObject<BoardFocus | null>;
}

function TournamentActions({ screen }: { screen: TournamentController }) {
  const { tournament, phase, refs } = screen;
  if (!tournament || isFinished(tournament))
    return (
      <div className="tournament-actions">
        <button type="button" className="control" onClick={screen.back}>
          {TournamentControl.back}
        </button>
      </div>
    );
  // After a game the next turn either finishes this match or starts the next one.
  const nextMatch = currentTurn(tournament)?.seat === 0;
  return (
    <div className="tournament-actions">
      {phase === TurnPhase.ready && (
        <button ref={refs.startTurn} type="button" className="control" onClick={screen.startTurn}>
          {TournamentControl.startTurn}
        </button>
      )}
      {phase === TurnPhase.ended && (
        <button type="button" className="control" onClick={screen.next}>
          {nextMatch ? TournamentControl.nextMatch : TournamentControl.nextTurn}
        </button>
      )}
      <button ref={refs.leave} type="button" className="control" onClick={screen.requestLeave}>
        {TournamentControl.leave}
      </button>
    </div>
  );
}

// The part of the Tournament screen below the live region. The board appears from Start turn
// until the next player's handoff, then hides so the deal stays out of view.
export function TournamentPlay({ screen, game, generation, board }: TournamentPlayProps) {
  const { tournament } = screen;
  const playing = tournament !== null && screen.phase !== TurnPhase.ready;
  return (
    <>
      {playing && <Board key={generation} game={game} activate={screen.activate} ref={board} />}
      <TournamentActions screen={screen} />
      {tournament && <Bracket tournament={tournament} />}
      {(!tournament || isFinished(tournament)) && <PastTournamentsTable past={screen.past} />}
      <TournamentExchange
        exportText={screen.exportText}
        load={screen.load}
        notice={screen.notice}
      />
    </>
  );
}
