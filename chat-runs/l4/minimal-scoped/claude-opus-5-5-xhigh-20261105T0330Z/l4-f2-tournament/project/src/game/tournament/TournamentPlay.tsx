import { currentTurn } from './rules.ts';
import { TournamentControl } from './tournament-labels.ts';
import { TournamentTurn } from './TournamentTurn.tsx';
import { TurnPhase } from './use-tournament.ts';
import type { RefObject } from 'react';
import type { TournamentFlow } from './use-tournament.ts';
import '../controls/control.css';
import './tournament.css';

interface TournamentPlayProps {
  flow: TournamentFlow;
  startButton: RefObject<HTMLButtonElement | null>;
  next(sameMatch: boolean): void;
  leave(): void;
}

// Whose turn it is goes through the page's status region. This part holds the turn itself.
export function TournamentPlay({ flow, startButton, next, leave }: TournamentPlayProps) {
  const { tournament, shown, phase } = flow;
  const match = shown && tournament?.rounds[shown.round]?.[shown.match];
  if (!tournament || !shown || !match) return null;
  const upcoming = currentTurn(tournament);
  const sameMatch = upcoming?.round === shown.round && upcoming.match === shown.match;
  return (
    <>
      {phase === TurnPhase.ready ? (
        <div className="tournament-actions">
          <button ref={startButton} type="button" className="control" onClick={flow.startTurn}>
            {TournamentControl.startTurn}
          </button>
        </div>
      ) : (
        <TournamentTurn
          key={flow.turnKey}
          code={match.boardCode}
          publish={flow.publish}
          finish={flow.finish}
        />
      )}
      <div className="tournament-actions">
        {phase === TurnPhase.done && (
          <button type="button" className="control" onClick={() => next(sameMatch)}>
            {sameMatch ? TournamentControl.nextTurn : TournamentControl.nextMatch}
          </button>
        )}
        <button type="button" className="control" onClick={leave}>
          {TournamentControl.leave}
        </button>
      </div>
    </>
  );
}
