import { useLayoutEffect, useRef } from 'react';
import { Bracket } from './Bracket.tsx';
import { Exchange } from './Exchange.tsx';
import { Setup } from './Setup.tsx';
import { Turn } from './Turn.tsx';
import { decodeTournament, encodeTournament } from './format.ts';
import { matchPlayers, matchStage, matchWinner, TournamentPhase } from './rules.ts';
import type { useTournament } from './use-tournament.ts';
import type { TournamentTurnHandle } from './Turn.tsx';
import './tournament.css';

interface TournamentProps {
  controller: ReturnType<typeof useTournament>;
  back(): void;
  confirm(action: () => void): void;
  publish(text: string): void;
}

export function Tournament({ controller, back, confirm, publish }: TournamentProps) {
  const { state, history } = controller;
  const heading = useRef<HTMLHeadingElement>(null);
  const turn = useRef<TournamentTurnHandle>(null);
  const match = state?.matches[state.currentMatch];
  const phase = state?.phase;
  const completed = phase === TournamentPhase.complete;
  const winner = state && completed ? matchWinner(state, state.currentMatch) : null;
  const player = state
    ? matchPlayers(state, state.currentMatch)[
        phase === TournamentPhase.turnResult ? 0 : (match?.results.length ?? 0) === 0 ? 0 : 1
      ]
    : null;
  const nowPlaying = state && player != null ? `Now playing: ${state.players[player]}` : '';
  const champion = state && winner != null ? `Champion: ${state.players[winner]}` : '';
  useLayoutEffect(() => {
    heading.current?.focus();
    publish(champion || nowPlaying || 'Tournament');
  }, [phase, state?.currentMatch, state?.players]);
  return (
    <section className="tournament">
      <h2 ref={heading} tabIndex={-1}>
        {completed ? 'Tournament complete' : 'Tournament'}
      </h2>
      <p className="help">
        Play the same deal in each match. Fewer moves wins; ties use time, then entry seed.
      </p>
      {!state && <Setup start={controller.start} publish={publish} />}
      {state && (
        <>
          {completed ? (
            <p className="tournament-champion">{champion}</p>
          ) : (
            <>
              <p>Round: {matchStage(state.players.length, state.currentMatch).round}</p>
              <p className="tournament-player">{nowPlaying}</p>
              <div className="tournament-actions">
                {phase === TournamentPhase.ready && (
                  <button className="control" type="button" onClick={controller.startTurn}>
                    Start turn
                  </button>
                )}
                {phase === TournamentPhase.turnResult && (
                  <button className="control" type="button" onClick={controller.advance}>
                    Next turn
                  </button>
                )}
                {phase === TournamentPhase.matchResult && (
                  <button className="control" type="button" onClick={controller.advance}>
                    Next match
                  </button>
                )}
                <button className="control" type="button" onClick={back}>
                  Leave tournament
                </button>
              </div>
            </>
          )}
          {phase === TournamentPhase.playing && state.game && (
            <Turn
              key={`${state.currentMatch}-${match?.results.length}`}
              game={state.game}
              ref={turn}
              update={controller.update}
              publish={publish}
            />
          )}
          {phase === TournamentPhase.matchResult && (
            <p>
              Match winner: {state.players[matchWinner(state, state.currentMatch) ?? 0]} (winner)
            </p>
          )}
          <Bracket state={state} />
        </>
      )}
      {(!state || completed) && (
        <button className="control" type="button" onClick={back}>
          Back to game
        </button>
      )}
      <Exchange
        exportTournament={() => {
          const game = turn.current?.exportGame();
          return encodeTournament(state && game ? { ...state, game } : state);
        }}
        load={(text) => {
          const result = decodeTournament(text);
          if (result.error) {
            publish(result.error);
            return result.error;
          }
          confirm(() => {
            controller.load(result.state ?? null);
            publish('Loaded tournament.');
          });
          return 'Tournament validated.';
        }}
      />
      <section className="past-tournaments" aria-labelledby="past-tournaments-title">
        <h3 id="past-tournaments-title">Past tournaments</h3>
        {history.blocked && <p>Progress won't be saved on this device.</p>}
        {history.items.length === 0 && <p>No finished tournaments yet.</p>}
        <ul>
          {history.items.map((item, index) => (
            <li key={index}>
              <button
                className="control"
                type="button"
                onClick={() => confirm(() => controller.view(item))}
              >
                View tournament {index + 1}: Champion:{' '}
                {item.players[matchWinner(item, item.currentMatch) ?? 0]}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
