import { useEffect, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { Bracket } from './Bracket.tsx';
import { champion, currentMatch } from './rules.ts';
import type { Tournament } from './rules.ts';

interface TournamentLiveProps {
  tournament: Tournament;
  startTurn(): void;
  activate(index: number): void;
  nextTurn(): void;
  nextMatch(): void;
  onBack(): void;
}

export function TournamentLive({
  tournament,
  startTurn,
  activate,
  nextTurn,
  nextMatch,
  onBack,
}: TournamentLiveProps) {
  const winner = champion(tournament);
  const match = currentMatch(tournament);
  const game = tournament.currentGame;
  const board = useRef<BoardFocus>(null);
  useEffect(() => {
    if (tournament.phase === 'playing') board.current?.focusRemembered();
  }, [tournament.currentMatchIndex, tournament.currentTurn, tournament.phase]);
  return (
    <div className="tournament-live">
      {winner ? (
        <div className="tournament-champion">
          <h3>Champion: {winner.name}</h3>
          <button className="control" type="button" onClick={onBack}>
            Back to game
          </button>
        </div>
      ) : (
        <>
          <p className="tournament-round">Round: {match.round}</p>
          {tournament.phase === 'ready' && (
            <button className="control" type="button" onClick={startTurn}>
              Start turn
            </button>
          )}
          {tournament.phase === 'turnComplete' && (
            <button
              className="control"
              type="button"
              onClick={tournament.currentTurn === 0 ? nextTurn : nextMatch}
            >
              {tournament.currentTurn === 0 ? 'Next turn' : 'Next match'}
            </button>
          )}
          {game && (
            <>
              <GameStatus game={game} best={undefined} celebration={false} showBest={false} />
              <p id="board-help" className="help">
                Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or
                Space reveals a card.
              </p>
              <Board
                key={`${tournament.currentMatchIndex}-${tournament.currentTurn}`}
                game={game}
                activate={activate}
                ref={board}
              />
            </>
          )}
        </>
      )}
      <Bracket tournament={tournament} />
    </div>
  );
}
