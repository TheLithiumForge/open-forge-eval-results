import { useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { matchWinner, roundFor } from './rules.ts';
import { TournamentPhase } from './model.ts';
import type { BoardFocus } from '../board/Board.tsx';
import type { Session } from '../session/session.ts';
import type { TournamentState } from './model.ts';

interface TournamentPlayProps {
  state: TournamentState;
  session: Session;
  startTurn(): void;
  nextTurn(): void;
  activate(index: number): void;
  leave(): void;
  back(): void;
  showHistory(): void;
}

export function TournamentPlay({
  state,
  session,
  startTurn,
  nextTurn,
  activate,
  leave,
  back,
  showHistory,
}: TournamentPlayProps) {
  const board = useRef<BoardFocus>(null);
  const phase = state.phase;
  const champion = matchWinner(state, state.matches.length - 1);
  if (phase === TournamentPhase.complete)
    return (
      <>
        <p className="tournament-champion">Champion: {state.players[(champion ?? 1) - 1]}</p>
        <div className="tournament-actions">
          <button type="button" className="control" onClick={back}>
            Back to game
          </button>
          <button type="button" className="control" onClick={showHistory}>
            Past tournaments
          </button>
        </div>
      </>
    );
  return (
    <>
      <p>Round: {roundFor(state.players.length, state.matchIndex).name}</p>
      <p>
        Match {state.matchIndex + 1} of {state.matches.length}
      </p>
      <div className="tournament-actions">
        {(phase === TournamentPhase.ready ||
          (phase === TournamentPhase.playing && session.paused)) && (
          <button type="button" className="control" onClick={startTurn}>
            Start turn
          </button>
        )}
        {phase === TournamentPhase.turnFinished && (
          <button type="button" className="control" onClick={nextTurn}>
            Next turn
          </button>
        )}
        {phase === TournamentPhase.matchFinished && (
          <button type="button" className="control" onClick={nextTurn}>
            Next match
          </button>
        )}
        <button type="button" className="control" onClick={leave}>
          Leave tournament
        </button>
      </div>
      {phase !== TournamentPhase.ready && (
        <>
          <GameStatus game={state.game} best={undefined} celebration={session.celebration} />
          <p id="board-help" className="help">
            Arrow keys move between cards. Enter or Space reveals a card.
          </p>
          <Board key={session.generation} ref={board} game={state.game} activate={activate} />
        </>
      )}
    </>
  );
}
