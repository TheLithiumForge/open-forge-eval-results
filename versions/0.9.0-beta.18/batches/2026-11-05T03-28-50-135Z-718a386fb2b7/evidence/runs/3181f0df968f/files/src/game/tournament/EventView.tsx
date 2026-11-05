import { Bracket } from './Bracket.tsx';
import { roundName } from './rules.ts';
import { Turn } from './Turn.tsx';
import type { Result, TournamentData } from './rules.ts';

interface Props {
  event: TournamentData;
  revision: number;
  back(): void;
  leave(): void;
  nextMatch(): void;
  finish(result: Result): void;
  capture(fn: (() => string) | null): void;
  announce(text: string): void;
  update(event: TournamentData, text: string): void;
}
export function EventView({
  event,
  revision,
  back,
  leave,
  nextMatch,
  finish,
  capture,
  announce,
  update,
}: Props) {
  const match = event.matches[event.current]!;
  const player =
    match.players[
      match.results[0] && (event.phase === 'ready' || event.phase === 'playing') ? 1 : 0
    ];
  return (
    <>
      {event.phase === 'champion' ? (
        <>
          <h3>Champion: {event.names[match.winner!]}</h3>
          <button className="control" onClick={back}>
            Back to game
          </button>
        </>
      ) : (
        <>
          <p>Round: {roundName(event.names.length, event.current)}</p>
          {(event.phase === 'ready' || event.phase === 'playing') && (
            <p>Now playing: {event.names[player!]}</p>
          )}
          {event.phase === 'ready' && (
            <button
              className="control"
              onClick={() =>
                update({ ...event, phase: 'playing' }, `Turn: ${event.names[player!]}`)
              }
            >
              Start turn
            </button>
          )}
          {event.phase === 'playing' && (
            <Turn
              key={`${revision}-${event.current}-${match.results[0] ? 1 : 0}`}
              code={match.code}
              snapshot={event.snapshot}
              finish={finish}
              capture={capture}
              announce={announce}
            />
          )}
          {event.phase === 'turn-ended' && (
            <button
              className="control"
              onClick={() =>
                update({ ...event, phase: 'ready' }, `Turn: ${event.names[match.players[1]!]}`)
              }
            >
              Next turn
            </button>
          )}
          {event.phase === 'match-ended' && (
            <button className="control" onClick={nextMatch}>
              Next match
            </button>
          )}
          <button className="control" onClick={leave}>
            Leave tournament
          </button>
        </>
      )}
      <Bracket tournament={event} />
    </>
  );
}
