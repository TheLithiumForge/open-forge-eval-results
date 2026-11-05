import { Bracket } from './Bracket.tsx';
import { TurnBoard } from './TurnBoard.tsx';
import { championLine, nowPlaying, TournamentControl } from './tournament-labels.ts';
import { NextStep, nextStep, shownTurn, shownTurnNumber, TurnPhase } from './tournament-session.ts';
import { champion, matchTitle } from './tournament.ts';
import type { TournamentSession } from './tournament-session.ts';
import type { TurnResult } from './tournament.ts';
import '../controls/control.css';
import './tournament.css';

interface ActiveTournamentProps {
  session: TournamentSession;
  startTurn(): void;
  finishTurn(result: TurnResult): void;
  nextTurn(): void;
  leave(): void;
  reset(): void;
  back(): void;
}

// A tournament in progress or finished. The button for the next step takes focus when it
// appears, because the one that was pressed is gone.
export function ActiveTournament({
  session,
  startTurn,
  finishTurn,
  nextTurn,
  leave,
  reset,
  back,
}: ActiveTournamentProps) {
  const { tournament, phase } = session;
  if (!tournament) return null;
  const winner = champion(tournament);
  const turn = shownTurn(session);
  const step = nextStep(session);
  return (
    <>
      <div className="tournament-status" role="status" aria-live="polite" aria-atomic="true">
        {winner !== null ? (
          <p className="champion">{championLine(winner)}</p>
        ) : (
          turn && <p id="now-playing">{nowPlaying(turn.player)}</p>
        )}
      </div>
      {winner === null && turn && (
        <p className="note">
          {matchTitle(tournament.players.length, turn.match)}. Both players play deal{' '}
          {turn.boardCode}.
        </p>
      )}
      <div className="tournament-actions">
        {phase === TurnPhase.ready && winner === null && (
          <button
            key="start-turn"
            type="button"
            className="control"
            autoFocus
            aria-describedby="now-playing"
            onClick={startTurn}
          >
            {TournamentControl.startTurn}
          </button>
        )}
        {step !== NextStep.none && (
          <button key={step} type="button" className="control" autoFocus onClick={nextTurn}>
            {step === NextStep.match ? TournamentControl.nextMatch : TournamentControl.nextTurn}
          </button>
        )}
        {winner === null ? (
          <button type="button" className="control" onClick={leave}>
            {TournamentControl.leave}
          </button>
        ) : (
          <>
            <button key="back" type="button" className="control" autoFocus onClick={back}>
              {TournamentControl.back}
            </button>
            <button type="button" className="control" onClick={reset}>
              {TournamentControl.newTournament}
            </button>
          </>
        )}
      </div>
      {winner === null && turn && phase !== TurnPhase.ready && (
        <TurnBoard
          key={shownTurnNumber(tournament, phase)}
          boardCode={turn.boardCode}
          player={turn.player}
          finished={finishTurn}
        />
      )}
      <Bracket tournament={tournament} current={winner === null && turn ? turn.match : null} />
    </>
  );
}
