import { useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { Setup } from './Setup.tsx';
import { Bracket } from './Bracket.tsx';
import { Exchange } from './Exchange.tsx';
import { TournamentPhase } from './model.ts';
import { currentMatchIndex, matchWinner } from './pairing.ts';
import type { BoardFocus } from '../board/Board.tsx';
import type { useTournament } from './use-tournament.ts';
import './tournament.css';

interface TournamentScreenProps {
  controller: ReturnType<typeof useTournament>;
  leave(): void;
  load(text: string): string;
  publish(text: string): void;
}

export function TournamentScreen({ controller, leave, load, publish }: TournamentScreenProps) {
  const { state, session, history } = controller;
  const board = useRef<BoardFocus>(null);
  const { phase, game } = state;
  const winner = matchWinner(state, state.matches.length - 1);
  const matchWinnerSeed = matchWinner(state, currentMatchIndex(state));
  const playing =
    phase === TournamentPhase.playing ||
    phase === TournamentPhase.turnEnd ||
    phase === TournamentPhase.matchEnd;
  return (
    <section className="tournament-screen" aria-label="Tournament">
      {phase === TournamentPhase.setup && (
        <Setup names={state.names} edit={controller.edit} start={controller.start} />
      )}
      {phase === TournamentPhase.ready && (
        <button type="button" className="control" onClick={controller.startTurn}>
          Start turn
        </button>
      )}
      {playing && game && (
        <>
          <GameStatus game={game} best={undefined} celebration={session.celebration} />
          <Board key={session.generation} game={game} ref={board} activate={controller.activate} />
        </>
      )}
      {phase === TournamentPhase.turnEnd && (
        <button type="button" className="control" onClick={controller.advance}>
          Next turn
        </button>
      )}
      {phase === TournamentPhase.matchEnd && (
        <>
          <p>Match winner: {matchWinnerSeed ? state.names[matchWinnerSeed - 1] : ''}</p>
          <button type="button" className="control" onClick={controller.advance}>
            Next match
          </button>
        </>
      )}
      {phase === TournamentPhase.complete && (
        <>
          <p className="tournament-champion">Champion: {winner ? state.names[winner - 1] : ''}</p>
          {game && <GameStatus game={game} best={undefined} celebration={session.celebration} />}
        </>
      )}
      <button type="button" className="control" onClick={leave}>
        {phase === TournamentPhase.complete || phase === TournamentPhase.setup
          ? 'Back to game'
          : 'Leave tournament'}
      </button>
      {phase !== TournamentPhase.setup && <Bracket state={state} />}
      <Exchange
        exportJSON={controller.exportJSON}
        load={load}
        publish={publish}
        loadNotice={controller.loadNotice}
      />
      {phase === TournamentPhase.setup && (
        <section className="tournament-history">
          <h3>Past tournaments</h3>
          {history.blocked && <p>Progress won't be saved on this device.</p>}
          {!history.items.length && <p>No finished tournaments yet.</p>}
          {history.items.map((item, index) => {
            const champion = matchWinner(item, item.matches.length - 1);
            return (
              <button
                type="button"
                className="control"
                key={index}
                onClick={() => controller.view(item)}
              >
                Tournament {history.items.length - index}: Champion:{' '}
                {champion ? item.names[champion - 1] : ''}
              </button>
            );
          })}
        </section>
      )}
    </section>
  );
}
