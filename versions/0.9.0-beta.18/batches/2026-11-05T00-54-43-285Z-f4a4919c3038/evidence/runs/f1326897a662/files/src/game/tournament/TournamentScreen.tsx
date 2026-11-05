import { useLayoutEffect, useRef } from 'react';
import { Bracket } from './Bracket.tsx';
import { Exchange } from './Exchange.tsx';
import { History } from './History.tsx';
import { Setup } from './Setup.tsx';
import { currentPlayer, matchWinner, roundForMatch, TournamentPhase } from './rules.ts';
import type { ReactNode } from 'react';
import type { useTournament } from './use-tournament.ts';
import type { TournamentDocument } from './format.ts';
import './tournament.css';

type Controller = ReturnType<typeof useTournament>;
interface HeadingProps {
  controller: Controller;
  paused: boolean;
  startTurn(): void;
  leave(): void;
}

export function TournamentHeading({ controller, paused, startTurn, leave }: HeadingProps) {
  const { tournament } = controller;
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    heading.current?.focus();
  }, [tournament, paused]);
  const completed = tournament?.phase === TournamentPhase.completed;
  const winner =
    tournament && completed ? matchWinner(tournament, tournament.matches.length - 1) : null;
  return (
    <div className="tournament">
      <h2 ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      {tournament && (
        <div className="tournament-context">
          <p>Round: {roundForMatch(tournament.players.length, tournament.currentMatch).name}</p>
          {!completed && <p>Now playing: {currentPlayer(tournament)}</p>}
          {winner !== null && (
            <p className="victory">Champion: {tournament?.players[winner - 1]}</p>
          )}
        </div>
      )}
      <div className="tournament-actions">
        {(tournament?.phase === TournamentPhase.ready ||
          (tournament?.phase === TournamentPhase.playing && paused)) && (
          <button type="button" className="control" onClick={startTurn}>
            Start turn
          </button>
        )}
        {tournament?.phase === TournamentPhase.turnFinished && (
          <button type="button" className="control" onClick={controller.advance}>
            Next turn
          </button>
        )}
        {tournament?.phase === TournamentPhase.matchFinished && (
          <button type="button" className="control" onClick={controller.advance}>
            Next match
          </button>
        )}
        <button type="button" className="control" onClick={leave}>
          {tournament && !completed ? 'Leave tournament' : 'Back to game'}
        </button>
      </div>
    </div>
  );
}

interface ContentProps {
  controller: Controller;
  children: ReactNode;
  exportTournament(): string;
  load(document: TournamentDocument): void;
  announce(message: string): void;
}

export function TournamentContent({ controller, children, ...exchange }: ContentProps) {
  const { tournament, setup, errors, history } = controller;
  return (
    <div className="tournament">
      {!tournament && (
        <>
          <p>Both players play the same deal. Fewer moves wins; ties use time, then entry order.</p>
          <Setup
            setup={setup}
            errors={errors}
            change={controller.setSetup}
            start={controller.start}
          />
        </>
      )}
      {children}
      {tournament && <Bracket tournament={tournament} />}
      {(!tournament || tournament.phase === TournamentPhase.completed) && (
        <History {...history} view={controller.view} />
      )}
      <Exchange {...exchange} />
    </div>
  );
}
