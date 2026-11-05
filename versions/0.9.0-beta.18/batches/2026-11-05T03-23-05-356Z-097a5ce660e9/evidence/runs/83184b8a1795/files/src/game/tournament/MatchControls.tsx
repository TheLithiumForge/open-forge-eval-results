import { roundName } from './model.ts';
import type { TournamentState } from './model.ts';
interface Props {
  tournament: TournamentState;
  player: string | null | undefined;
  playing: boolean;
  handoff: boolean;
  start(): void;
  nextTurn(): void;
  nextMatch(): void;
  leave(): void;
}
export function MatchControls({
  tournament,
  player,
  playing,
  handoff,
  start,
  nextTurn,
  nextMatch,
  leave,
}: Props) {
  const match = tournament.matches.at(-1);
  return (
    <>
      <p>Round: {roundName(tournament.names.length, tournament.matches.length - 1)}</p>
      {player && <p>Now playing: {player}</p>}
      {!playing && !handoff && match && match.results.length < 2 && (
        <button className="control" onClick={start}>
          Start turn
        </button>
      )}
      {!playing && handoff && match?.results.length === 1 && (
        <button className="control" onClick={nextTurn}>
          Next turn
        </button>
      )}
      {!playing && match?.results.length === 2 && (
        <button className="control" onClick={nextMatch}>
          Next match
        </button>
      )}
      <button className="control" onClick={leave}>
        Leave tournament
      </button>
    </>
  );
}
