import { useEffect, useRef } from 'react';
import { PastTournaments } from './PastTournaments.tsx';
import { TournamentBracket } from './TournamentBracket.tsx';
import { TournamentExchange } from './TournamentExchange.tsx';
import { TournamentPlay } from './TournamentPlay.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { useTournament } from './use-tournament.ts';
import './tournament.css';

export function TournamentScreen({ onBack }: { onBack(): void }) {
  const controller = useTournament();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section className="tournament-screen" aria-labelledby="tournament-title">
      <h2 id="tournament-title" ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={controller.announcement}>{controller.feedback}</span>
        </p>
      </div>
      {controller.tournament ? (
        <>
          <TournamentPlay
            activate={controller.activate}
            advance={controller.advance}
            back={onBack}
            leave={onBack}
            match={controller.activeMatch}
            startTurn={controller.startTurn}
            tournament={controller.tournament}
            turnGame={controller.turnGame}
            turnSession={controller.turnSession}
            turnStarted={controller.turnStarted}
          />
          <TournamentBracket tournament={controller.tournament} />
        </>
      ) : (
        <TournamentSetup start={controller.start} leave={onBack} report={controller.report} />
      )}
      <PastTournaments
        tournaments={controller.history}
        storageAvailable={controller.storageAvailable}
      />
      <TournamentExchange exportJson={controller.exportJson} loadJson={controller.loadJson} />
    </section>
  );
}
