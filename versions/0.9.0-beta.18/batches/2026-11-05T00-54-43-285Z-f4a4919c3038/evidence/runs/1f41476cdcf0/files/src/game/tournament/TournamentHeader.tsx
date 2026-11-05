import { GameStatus } from '../status/GameStatus.tsx';
import { matchPlayers, matchWinner, tournamentRound } from './rules.ts';
import { TournamentPhase } from './types.ts';
import { TournamentSetupForm } from './TournamentSetup.tsx';
import type { RefObject } from 'react';
import type { TournamentController } from '../session/use-tournament.ts';

interface TournamentHeaderProps {
  controller: TournamentController;
  heading: RefObject<HTMLHeadingElement | null>;
  back(): void;
  leave(): void;
}

export function TournamentHeader({ controller, heading, back, leave }: TournamentHeaderProps) {
  const { tournament, session } = controller;
  const complete = tournament?.phase === TournamentPhase.complete;
  const seed = tournament ? matchPlayers(tournament, tournament.matchIndex)[tournament.turn] : null;
  const winner = tournament ? matchWinner(tournament, tournament.matchIndex) : null;
  return (
    <div className="tournament-header">
      <h2 tabIndex={-1} ref={heading}>
        {complete ? 'Tournament complete' : 'Tournament'}
      </h2>
      {!tournament ? (
        <>
          <TournamentSetupForm controller={controller} />
          <button className="control" type="button" onClick={back}>
            Back to game
          </button>
        </>
      ) : (
        <>
          {complete ? (
            <p className="victory">Champion: {winner === null ? '' : tournament.players[winner]}</p>
          ) : (
            <>
              <p>Round: {tournamentRound(tournament.players.length, tournament.matchIndex).name}</p>
              <p className="tournament-owner">
                Now playing: {seed == null ? '' : tournament.players[seed]}
              </p>
            </>
          )}
          {tournament.phase === TournamentPhase.turnComplete && (
            <p>
              Turn complete: {tournament.matches[tournament.matchIndex]?.results[0]?.moves} moves.
            </p>
          )}
          {tournament.phase === TournamentPhase.matchComplete && (
            <p>Winner: {winner === null ? '' : tournament.players[winner]}</p>
          )}
          <div className="tournament-actions">
            {(tournament.phase === TournamentPhase.ready ||
              (tournament.phase === TournamentPhase.playing && session.paused)) && (
              <button className="control" type="button" onClick={controller.startTurn}>
                Start turn
              </button>
            )}
            {tournament.phase === TournamentPhase.turnComplete && (
              <button className="control" type="button" onClick={controller.next}>
                Next turn
              </button>
            )}
            {tournament.phase === TournamentPhase.matchComplete && (
              <button className="control" type="button" onClick={controller.next}>
                Next match
              </button>
            )}
            {complete ? (
              <>
                <button className="control" type="button" onClick={back}>
                  Back to game
                </button>
                <button className="control" type="button" onClick={controller.reset}>
                  Tournament screen
                </button>
              </>
            ) : (
              <button className="control" type="button" onClick={leave}>
                Leave tournament
              </button>
            )}
          </div>
          {tournament.phase === TournamentPhase.playing && !session.paused && (
            <>
              <GameStatus game={session.game} best={undefined} celebration={false} />
              <p id="board-help" className="help">
                Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or
                Space reveals a card.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
