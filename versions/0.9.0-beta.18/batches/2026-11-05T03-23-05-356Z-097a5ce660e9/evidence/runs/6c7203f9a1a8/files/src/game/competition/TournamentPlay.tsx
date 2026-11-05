import { Board } from '../board/Board.tsx';
import { formatElapsed } from '../elapsed-time.ts';
import { isWon } from '../game.ts';
import { Bracket } from './Bracket.tsx';
import { tournamentPlayer } from './rules.ts';
import type { BoardFocus } from '../board/Board.tsx';
import type { RefObject } from 'react';
import type { GameState } from '../game.ts';
import type { Tournament } from './rules.ts';

interface TournamentPlayProps {
  backButton: RefObject<HTMLButtonElement | null>;
  board: RefObject<BoardFocus | null>;
  game: GameState | null;
  generation: number;
  onActivate(index: number): void;
  onBack(): void;
  onLeave(): void;
  onNextMatch(): void;
  onNextTurn(): void;
  onStartTurn(): void;
  startButton: RefObject<HTMLButtonElement | null>;
  tournament: Tournament;
}

export function TournamentPlay({
  backButton,
  board,
  game,
  generation,
  onActivate,
  onBack,
  onLeave,
  onNextMatch,
  onNextTurn,
  onStartTurn,
  startButton,
  tournament,
}: TournamentPlayProps) {
  const phase = tournament.phase;
  const round = tournament.rounds[tournament.roundIndex];
  const player = tournamentPlayer(tournament);
  const champion = tournament.rounds.at(-1)?.matches[0]?.winner;
  return (
    <div className="tournament-active">
      {round && <p className="tournament-round">Round: {round.name}</p>}
      {(phase === 'ready' || phase === 'playing') && player && (
        <p className="tournament-now-playing">Now playing: {player}</p>
      )}
      {phase === 'ready' && player && (
        <button ref={startButton} type="button" className="control" onClick={onStartTurn}>
          Start turn
        </button>
      )}
      {phase === 'next-turn' && (
        <button type="button" className="control" onClick={onNextTurn}>
          Next turn
        </button>
      )}
      {phase === 'next-match' && (
        <button type="button" className="control" onClick={onNextMatch}>
          Next match
        </button>
      )}
      {phase === 'complete' && (
        <div className="tournament-champion">
          <h3>Champion: {champion}</h3>
          <button ref={backButton} type="button" className="control" onClick={onBack}>
            Back to game
          </button>
        </div>
      )}
      {game && (
        <>
          <dl className="tournament-stats">
            <div>
              <dt>Moves</dt>
              <dd>{game.moves}</dd>
            </div>
            <div>
              <dt>Pairs</dt>
              <dd>
                {game.matched.length / 2} / {game.deck.length / 2}
              </dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{formatElapsed(game.elapsedMs)}</dd>
            </div>
          </dl>
          {isWon(game) && <p className="tournament-finished">Turn complete.</p>}
          <p id="board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <Board key={generation} game={game} activate={onActivate} ref={board} />
        </>
      )}
      <Bracket tournament={tournament} />
      {phase !== 'complete' && (
        <button type="button" className="control tournament-leave" onClick={onLeave}>
          Leave tournament
        </button>
      )}
    </div>
  );
}
