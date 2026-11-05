import type { RefObject } from 'react';
import { TournamentBracket } from './TournamentBracket.tsx';
import { TournamentDialog } from './TournamentDialog.tsx';
import { TournamentHistory } from './TournamentHistory.tsx';
import { TournamentJsonPanel } from './TournamentJsonPanel.tsx';
import { TournamentProgress } from './TournamentProgress.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import type { TournamentController } from './use-tournament.ts';

interface TournamentScreenProps {
  readonly championRef: RefObject<HTMLParagraphElement | null>;
  readonly controller: TournamentController;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly onBack: () => void;
}

export function TournamentScreen({ championRef, controller, headingRef, onBack }: TournamentScreenProps) {
  const { tournament } = controller;
  return (
    <main className="tournament-screen">
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <h2 ref={headingRef} className="tournament-title" tabIndex={-1}>Tournament</h2>
      <p className="tournament-live" role="status" aria-live="polite" aria-atomic="true">
        <span key={controller.statusKey}>{controller.status}</span>
      </p>
      {tournament?.status === 'complete' && tournament.champion && (
        <div className="tournament-champion">
          <p ref={championRef} tabIndex={-1}><strong>Champion: {tournament.champion.name}</strong></p>
          <button className="control" type="button" onClick={onBack}>Back to game</button>
        </div>
      )}
      {!tournament && (
        <TournamentSetup
          draft={controller.draft}
          onDraftChange={controller.setDraft}
          onStart={controller.startTournament}
          onBack={onBack}
        />
      )}
      <TournamentProgress controller={controller} />
      {tournament?.status === 'complete' && (
        <TournamentBracket current={null} rounds={tournament.rounds} />
      )}
      <TournamentJsonPanel
        json={controller.json}
        onExport={controller.exportCurrent}
        onJsonChange={controller.setJson}
        onLoad={controller.loadFromJson}
      />
      <TournamentHistory available={controller.storageAvailable} tournaments={controller.history} />
      <TournamentDialog
        action={controller.dialogAction}
        open={controller.dialogAction !== null}
        onCancel={controller.cancelDialog}
        onConfirm={controller.confirmDialog}
      />
    </main>
  );
}
