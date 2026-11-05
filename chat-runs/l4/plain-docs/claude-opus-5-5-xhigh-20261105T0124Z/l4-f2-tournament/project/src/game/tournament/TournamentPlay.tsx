import { useRef, useState } from 'react';
import { Bracket } from './Bracket.tsx';
import { LeaveDialog } from './LeaveDialog.tsx';
import { TournamentTurn } from './TournamentTurn.tsx';
import { attemptCount, champion } from './rules.ts';
import { TournamentControl } from './tournament-labels.ts';
import type { Attempt } from './rules.ts';
import type { Run } from './use-tournament.ts';

interface TournamentPlayProps {
  run: Run;
  announce(text: string): void;
  finish(attempt: Attempt): void;
  next(): void;
  leave(): void;
}

export function TournamentPlay({ run, announce, finish, next, leave }: TournamentPlayProps) {
  const [leaving, setLeaving] = useState(false);
  const leaveButton = useRef<HTMLButtonElement>(null);
  const { tournament, turn } = run;
  const match = tournament.matches[Math.floor(turn / 2)];
  const finished = champion(tournament) !== null;
  // A recorded game waits for its handoff: the second game of a match ends the match.
  const after =
    attemptCount(tournament) > turn && !finished ? (
      <button type="button" className="control" onClick={next}>
        {turn % 2 ? TournamentControl.nextMatch : TournamentControl.nextTurn}
      </button>
    ) : null;
  function keep(): void {
    setLeaving(false);
    leaveButton.current?.focus();
  }
  return (
    <>
      {match && (
        <TournamentTurn
          key={`${run.id}-${turn}`}
          boardCode={match.boardCode}
          focusStart={run.handoff}
          after={after}
          announce={announce}
          finish={finish}
        />
      )}
      <Bracket tournament={tournament} />
      {!finished && (
        <div className="tournament-actions">
          <button
            ref={leaveButton}
            type="button"
            className="control"
            onClick={() => setLeaving(true)}
          >
            {TournamentControl.leave}
          </button>
        </div>
      )}
      {leaving && <LeaveDialog keep={keep} leave={leave} />}
    </>
  );
}
