import { Playing } from './Playing.tsx';
import type { PlayHandle } from './Playing.tsx';
import { Bracket } from './Bracket.tsx';
import { newMatch, roundName } from './rules.ts';
import { nextCode } from './history.ts';
import type { Match, Result, TournamentState } from './rules.ts';
import type { Dispatch, RefObject, SetStateAction } from 'react';

interface Props {
  t: TournamentState;
  last: Match;
  player: number;
  playKey: number;
  setPlayKey: Dispatch<SetStateAction<number>>;
  setT(t: TournamentState): void;
  play: RefObject<PlayHandle | null>;
  completeTurn(result: Result): void;
  publish(text: string): void;
  back(): void;
  leave(): void;
}
export function Active({
  t,
  last,
  player,
  playKey,
  setPlayKey,
  setT,
  play,
  completeTurn,
  publish,
  back,
  leave,
}: Props) {
  return (
    <>
      <p>Round: {roundName(t.names.length, t.matches.length - 1)}</p>
      {t.phase === 'complete' ? (
        <p className="champion">Champion: {t.names[last.winner!]}</p>
      ) : (
        <p>Now playing: {t.names[player]}</p>
      )}
      {t.phase === 'ready' && (
        <button
          className="control"
          type="button"
          onClick={() => {
            setPlayKey((key) => key + 1);
            setT({ ...t, phase: 'playing', snapshot: null });
          }}
        >
          Start turn
        </button>
      )}
      {t.phase === 'playing' && (
        <Playing
          key={playKey}
          code={last.code}
          snapshot={t.snapshot}
          finished={completeTurn}
          publish={publish}
          handle={play}
        />
      )}
      {t.phase === 'turnDone' && (
        <button className="control" type="button" onClick={() => setT({ ...t, phase: 'ready' })}>
          Next turn
        </button>
      )}
      {t.phase === 'matchDone' && (
        <button
          className="control"
          type="button"
          onClick={() =>
            setT({
              ...t,
              matches: [...t.matches, newMatch(t.names, t.matches, nextCode(t))],
              phase: 'ready',
            })
          }
        >
          Next match
        </button>
      )}
      <Bracket t={t} />
      {t.phase === 'complete' ? (
        <button className="control" type="button" onClick={back}>
          Back to game
        </button>
      ) : (
        <button
          className="control"
          type="button"
          onClick={() => {
            leave();
          }}
        >
          Leave tournament
        </button>
      )}
    </>
  );
}
