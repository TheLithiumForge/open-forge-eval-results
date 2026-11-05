import { useEffect, useRef } from 'react';
import { ActiveTournament } from './ActiveTournament.tsx';
import { PastTournaments } from './PastTournaments.tsx';
import { SetupForm } from './SetupForm.tsx';
import { TransferPanel } from './TransferPanel.tsx';
import { TournamentControl } from './tournament-labels.ts';
import { useSetupDraft } from './use-setup-draft.ts';
import { useTournament } from './use-tournament.ts';
import './tournament.css';

interface TournamentScreenProps {
  size: number;
  back(): void;
}

// Replaces the game while a tournament is set up, played or looked at. Opening it moves focus to
// its heading, because the button that opened it is gone.
export function TournamentScreen({ size, back }: TournamentScreenProps) {
  const tournament = useTournament(size);
  const draft = useSetupDraft();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const { session } = tournament;
  return (
    <section className="tournament" aria-labelledby="tournament-heading">
      <h2 id="tournament-heading" ref={heading} tabIndex={-1}>
        {TournamentControl.heading}
      </h2>
      <p className="tournament-notice" role="status" aria-live="polite" aria-atomic="true">
        {session.notice}
      </p>
      {session.tournament ? (
        <ActiveTournament
          session={session}
          startTurn={tournament.startTurn}
          finishTurn={tournament.finishTurn}
          nextTurn={tournament.nextTurn}
          leave={tournament.leave}
          reset={tournament.reset}
          back={back}
        />
      ) : (
        <>
          <SetupForm
            draft={draft}
            size={size}
            start={() => tournament.start(draft.entries, draft.count)}
            back={back}
          />
          <PastTournaments past={tournament.past} view={tournament.viewPast} />
        </>
      )}
      <TransferPanel
        exportTournament={() => tournament.exportTournament(draft.entries, draft.count)}
        loadTournament={tournament.loadTournament}
      />
    </section>
  );
}
