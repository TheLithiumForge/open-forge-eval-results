import { useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { currentPlayer, tournamentRound } from './rules.ts';
import { TournamentPhase } from './model.ts';
import type { BoardFocus } from '../board/Board.tsx';
import type { TournamentState } from './model.ts';

interface TurnProps {
  tournament: TournamentState;
  paused: boolean;
  generation: number;
  celebration: boolean;
  startTurn(): void;
  next(): void;
  activate(index: number): void;
}

export function Turn({
  tournament,
  paused,
  generation,
  celebration,
  startTurn,
  next,
  activate,
}: TurnProps) {
  const board = useRef<BoardFocus>(null);
  const phase = tournament.phase;
  const visibleBoard =
    phase !== TournamentPhase.ready && !(phase === TournamentPhase.playing && paused);
  const match = tournament.matches[tournament.currentMatch]!;
  return (
    <section className="tournament-turn">
      <p>Round: {tournamentRound(tournament.names.length, tournament.currentMatch).name}</p>
      <p>Now playing: {tournament.names[currentPlayer(tournament)]}</p>
      {(phase === TournamentPhase.ready || (phase === TournamentPhase.playing && paused)) && (
        <button className="control" type="button" onClick={startTurn}>
          Start turn
        </button>
      )}
      {visibleBoard && (
        <>
          <GameStatus game={tournament.game} best={undefined} celebration={celebration} />
          <p id="board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <Board key={generation} game={tournament.game} activate={activate} ref={board} />
        </>
      )}
      {phase === TournamentPhase.turnComplete && (
        <button className="control" type="button" onClick={next}>
          Next turn
        </button>
      )}
      {phase === TournamentPhase.matchComplete && (
        <>
          <p>Winner: {tournament.names[match.winner!]}</p>
          <button className="control" type="button" onClick={next}>
            Next match
          </button>
        </>
      )}
    </section>
  );
}
