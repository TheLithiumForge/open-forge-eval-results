import { useRef } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { roundName } from './tournament.ts';
import { Bracket } from './Bracket.tsx';
import type { useTournament } from './use-tournament.ts';

type State = ReturnType<typeof useTournament>;
export function MatchView({ state, back }: { state: State; back(): void }) {
  const board = useRef<BoardFocus>(null);
  const { tournament: t, controller, setTournament, startTurn, confirmLeave } = state;
  if (!t) return null;
  const match = t.matches[t.current]!;
  const player = match.players[match.scores[0] === null ? 0 : 1];
  return (
    <section className="tournament-section">
      {t.phase === 'complete' ? (
        <>
          <p className="champion">Champion: {t.names[match.winner!]}</p>
          <button className="control" type="button" onClick={back}>
            Back to game
          </button>
        </>
      ) : (
        <>
          <p>Round: {roundName(t.names.length, t.current)}</p>
          <p>Now playing: {t.names[player!]}</p>
          {t.phase === 'ready' && (
            <button className="control" type="button" onClick={startTurn}>
              Start turn
            </button>
          )}
          {t.phase === 'turnComplete' && (
            <button
              className="control"
              type="button"
              onClick={() => {
                state.setNotice('');
                setTournament({ ...t, phase: 'ready' });
              }}
            >
              Next turn
            </button>
          )}
          {t.phase === 'matchComplete' && (
            <button
              className="control"
              type="button"
              onClick={() => (
                state.setNotice(''),
                setTournament({ ...t, current: t.current + 1, phase: 'ready' })
              )}
            >
              Next match
            </button>
          )}{' '}
          <button className="control" type="button" onClick={() => confirmLeave(back)}>
            Leave tournament
          </button>
        </>
      )}
      {t.phase === 'playing' && (
        <>
          <GameStatus
            game={controller.session.game}
            best={undefined}
            showBest={false}
            celebration={controller.session.celebration}
          />
          <p id="board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <Board
            key={controller.session.generation}
            game={controller.session.game}
            activate={(index) => {
              state.setNotice('');
              controller.activate(index);
            }}
            ref={board}
          />
        </>
      )}
      <Bracket tournament={t} />
    </section>
  );
}
