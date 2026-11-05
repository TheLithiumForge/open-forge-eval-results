import { useEffect, useRef, useState } from 'react';
import { ExchangePanel } from './ExchangePanel.tsx';
import { Screen } from './flow.ts';
import { LeaveDialog } from './LeaveDialog.tsx';
import { PastTournaments } from './PastTournaments.tsx';
import { SetupForm } from './SetupForm.tsx';
import { TournamentControl } from './tournament-labels.ts';
import { TurnPanel } from './TurnPanel.tsx';
import { useTournament } from './use-tournament.ts';
import type { ReactNode } from 'react';
import type { RecordTournament } from './use-saved-tournaments.ts';
import type { SavedTournaments } from './storage.ts';
import '../controls/control.css';
import './tournament.css';

export interface LiveResult {
  feedback: string;
  announcement: number;
  now: string;
}

interface TournamentProps {
  saved: SavedTournaments;
  record: RecordTournament;
  // Draws the game's one live region, which this screen shows below its heading.
  result(live: LiveResult): ReactNode;
  back(): void;
}

// Replaces the game screen and exists only while it is shown, so its clock and its tournament end
// with it. Focus lands on the heading when the screen opens or is replaced.
export function Tournament({ saved, record, result, back }: TournamentProps) {
  const controller = useTournament(record);
  const heading = useRef<HTMLHeadingElement>(null);
  const [landing, setLanding] = useState(0);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    heading.current?.focus();
  }, [landing]);
  const { screen, state, round, now } = controller;
  const land = () => setLanding((value) => value + 1);
  return (
    <section className="tournament" aria-labelledby="tournament-heading">
      <h2 id="tournament-heading" ref={heading} tabIndex={-1}>
        {TournamentControl.heading}
      </h2>
      {round && <p className="round">{`Round: ${round}`}</p>}
      {result({
        feedback: state.session.feedback,
        announcement: state.session.announcement,
        now,
      })}
      {screen === Screen.setup ? (
        <SetupForm
          count={state.count}
          drafts={state.drafts}
          setCount={controller.setCount}
          setName={controller.setName}
          start={controller.start}
          started={land}
        />
      ) : (
        <TurnPanel
          controller={controller}
          saved={saved}
          askLeave={() => setLeaving(true)}
          back={back}
        />
      )}
      <ExchangePanel
        exportTournament={controller.exportTournament}
        loadTournament={controller.loadTournament}
      />
      {screen === Screen.setup && (
        <>
          <PastTournaments saved={saved} />
          <div className="tournament-row">
            <button type="button" className="control" onClick={back}>
              {TournamentControl.back}
            </button>
          </div>
        </>
      )}
      {leaving && (
        <LeaveDialog
          keepPlaying={() => setLeaving(false)}
          leave={() => {
            setLeaving(false);
            controller.leave();
            land();
          }}
        />
      )}
    </section>
  );
}
