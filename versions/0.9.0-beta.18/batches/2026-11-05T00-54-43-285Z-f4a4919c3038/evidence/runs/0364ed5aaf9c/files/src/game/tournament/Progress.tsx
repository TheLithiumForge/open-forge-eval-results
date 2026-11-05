import { GameStatus } from '../status/GameStatus.tsx';
import {
  isTournamentComplete,
  nextTournamentTurn,
  tournamentBracket,
  TournamentPhase,
} from './rules.ts';
import type { Tournament } from './rules.ts';

interface ProgressProps {
  tournament: Tournament;
  change(next: Tournament): void;
  publish(message: string): void;
  celebration: boolean;
}

export function TournamentProgress({ tournament, change, publish, celebration }: ProgressProps) {
  const bracket = tournamentBracket(tournament);
  const offset =
    tournament.results.length - (tournament.phase === TournamentPhase.finished ? 1 : 0);
  const match = bracket[Math.floor(offset / 2)];
  const player = match?.players[offset % 2];
  const name = player == null ? '' : tournament.names[player];
  const champion = bracket.at(-1)?.winner;
  if (isTournamentComplete(tournament))
    return (
      <p className={`victory${celebration ? ' celebrate' : ''}`}>
        Champion: {champion == null ? '' : tournament.names[champion]}
      </p>
    );
  return (
    <>
      <p>Round: {match?.round}</p>
      <p>Now playing: {name}</p>
      {tournament.phase === TournamentPhase.ready && (
        <button
          type="button"
          className="control"
          onClick={() => {
            change({ ...tournament, phase: TournamentPhase.playing });
            publish(`${name} is playing. Reveal two cards.`);
          }}
        >
          Start turn
        </button>
      )}
      {tournament.phase === TournamentPhase.finished && (
        <>
          <GameStatus
            game={tournament.game}
            best={undefined}
            celebration={celebration}
            showBest={false}
          />
          <button
            type="button"
            className="control"
            onClick={() => {
              const next = nextTournamentTurn(tournament);
              change(next);
              const nextMatch = tournamentBracket(next)[Math.floor(next.results.length / 2)];
              const nextPlayer = nextMatch?.players[next.results.length % 2];
              publish(`${nextPlayer == null ? '' : next.names[nextPlayer]}, select Start turn.`);
            }}
          >
            {tournament.results.length % 2 ? 'Next turn' : 'Next match'}
          </button>
        </>
      )}
    </>
  );
}
