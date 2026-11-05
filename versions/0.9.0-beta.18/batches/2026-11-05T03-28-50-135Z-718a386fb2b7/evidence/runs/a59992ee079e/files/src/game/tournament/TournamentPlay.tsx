import { useEffect, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { TournamentLeave } from './TournamentLeave.tsx';
import { nextTournamentAction } from './rules.ts';
import type { GameState } from '../game.ts';
import type { Session } from '../session/session.ts';
import type { Tournament, TournamentMatch } from './model.ts';

interface TournamentPlayProps {
  activate(index: number): void;
  advance(): void;
  back(): void;
  leave(): void;
  match: TournamentMatch | null;
  startTurn(): void;
  tournament: Tournament;
  turnGame: GameState | null;
  turnSession: Session;
  turnStarted: boolean;
}

export function TournamentPlay({
  activate,
  advance,
  back,
  leave,
  match,
  startTurn,
  tournament,
  turnGame,
  turnSession,
  turnStarted,
}: TournamentPlayProps) {
  const board = useRef<BoardFocus>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const actionButton = useRef<HTMLButtonElement>(null);
  const championHeading = useRef<HTMLHeadingElement>(null);
  const action = nextTournamentAction(tournament);
  const player = match?.players[tournament.playerIndex] ?? null;
  const round = tournament.rounds[tournament.roundIndex];

  useEffect(() => {
    if (tournament.status === 'finished') championHeading.current?.focus();
    else if (action) actionButton.current?.focus();
    else if (turnStarted) board.current?.focusRemembered();
    else startButton.current?.focus();
  }, [
    tournament.status,
    tournament.roundIndex,
    tournament.matchIndex,
    tournament.playerIndex,
    turnStarted,
    action,
  ]);

  if (tournament.status === 'finished') {
    return (
      <section className="tournament-play" aria-labelledby="champion-heading">
        <h3 id="champion-heading" ref={championHeading} tabIndex={-1}>
          Champion: {tournament.champion?.name ?? ''}
        </h3>
        <div className="tournament-actions">
          <button type="button" className="control" onClick={back}>
            Back to game
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="tournament-play" aria-labelledby="tournament-round-heading">
      <h3 id="tournament-round-heading">Round: {round?.name ?? ''}</h3>
      <p className="tournament-match-label">Match: {match?.id ?? ''}</p>
      {player ? (
        <p className="tournament-now-playing">Now playing: {player.name}</p>
      ) : action === 'match' ? (
        <p className="tournament-now-playing">Match complete.</p>
      ) : null}
      {match && <p className="tournament-deal">Board code: {match.boardCode}</p>}
      <div className="tournament-actions">
        {action === 'turn' ? (
          <button ref={actionButton} type="button" className="control" onClick={advance}>
            Next turn
          </button>
        ) : action === 'match' ? (
          <button ref={actionButton} type="button" className="control" onClick={advance}>
            Next match
          </button>
        ) : !turnStarted ? (
          <button ref={startButton} type="button" className="control" onClick={startTurn}>
            Start turn
          </button>
        ) : null}
        <TournamentLeave onLeave={leave} />
      </div>
      {turnStarted && turnGame && (
        <div className="tournament-game">
          <GameStatus
            game={turnGame}
            best={undefined}
            celebration={turnSession.celebration}
            showBest={false}
          />
          <p id="board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <Board key={turnSession.generation} game={turnGame} activate={activate} ref={board} />
        </div>
      )}
    </section>
  );
}
