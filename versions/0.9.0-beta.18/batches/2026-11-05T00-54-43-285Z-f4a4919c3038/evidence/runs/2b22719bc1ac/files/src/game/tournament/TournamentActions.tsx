import { nextMatch, nextTurn, TournamentPhase } from './rules.ts';
import type { TournamentState } from './rules.ts';

interface TournamentActionsProps {
  tournament: TournamentState;
  advance(next: TournamentState): void;
  leave(): void;
}
export function TournamentActions({ tournament, advance, leave }: TournamentActionsProps) {
  const label =
    tournament.phase === TournamentPhase.turnDone
      ? 'Next turn'
      : tournament.phase === TournamentPhase.matchDone
        ? 'Next match'
        : '';
  return (
    <div className="tournament-actions">
      {label && (
        <button
          className="control"
          type="button"
          onClick={() =>
            advance(
              tournament.phase === TournamentPhase.turnDone
                ? nextTurn(tournament)
                : nextMatch(tournament),
            )
          }
        >
          {label}
        </button>
      )}
      <button className="control" type="button" onClick={leave}>
        Leave tournament
      </button>
    </div>
  );
}
