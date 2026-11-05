import { useRef } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { useGame } from './session/use-game.ts';
import { GameStatus } from './status/GameStatus.tsx';
import { TournamentBracket } from './TournamentBracket.tsx';
import { roundFor } from './tournament.ts';
import type { TournamentState } from './tournament.ts';
interface Props {
  tournament: TournamentState;
  controller: ReturnType<typeof useGame>;
  begin(): void;
  advance(): void;
  back(): void;
  leave(): void;
  clearNotice(): void;
}
export function TournamentPlay({
  tournament,
  controller,
  begin,
  advance,
  back,
  leave,
  clearNotice,
}: Props) {
  const board = useRef<BoardFocus>(null);
  const match = tournament.matches.at(-1);
  const player = match?.results[0] ? 1 : 0;
  return (
    <>
      {match && tournament.phase !== 'complete' && (
        <>
          <p>Round: {roundFor(tournament.names.length, tournament.matches.length - 1).name}</p>
          <p>Now playing: {tournament.names[match.players[player]]}</p>
        </>
      )}
      {tournament.phase === 'complete' && match && (
        <h3>Champion: {tournament.names[match.winner!]}</h3>
      )}
      <div className="tournament-actions">
        {tournament.phase === 'ready' && (
          <button className="control" type="button" onClick={begin}>
            Start turn
          </button>
        )}
        {tournament.phase === 'turnEnd' && (
          <button className="control" type="button" onClick={advance}>
            Next turn
          </button>
        )}
        {tournament.phase === 'matchEnd' && (
          <button className="control" type="button" onClick={advance}>
            Next match
          </button>
        )}
        {tournament.phase === 'complete' ? (
          <button className="control" type="button" onClick={back}>
            Back to game
          </button>
        ) : (
          <button className="control" type="button" onClick={leave}>
            Leave tournament
          </button>
        )}
      </div>
      {tournament.phase === 'playing' && (
        <>
          <GameStatus
            game={controller.session.game}
            best={undefined}
            celebration={controller.session.celebration}
            hideBest
          />
          {controller.session.paused && (
            <button
              className="control"
              onClick={() => {
                board.current?.focusRemembered();
                clearNotice();
                controller.resume();
              }}
            >
              Resume
            </button>
          )}
          <p id="board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <Board
            key={controller.session.generation}
            game={controller.session.game}
            activate={(index) => {
              clearNotice();
              controller.activate(index);
            }}
            ref={board}
          />
        </>
      )}
      <TournamentBracket tournament={tournament} />
    </>
  );
}
