import { useEffect, useRef, useState } from 'react';
import { normalizeTournamentName, validateTournamentNames } from './names.ts';
import { PastTournaments } from './PastTournaments.tsx';
import { TournamentExchange } from './TournamentExchange.tsx';
import { TournamentLive } from './TournamentLive.tsx';
import { TournamentLeaveDialog } from './TournamentLeaveDialog.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { useTournament } from './use-tournament.ts';
import { currentPlayer } from './rules.ts';
import { decodeTournamentFile } from './format.ts';
import type { FormEvent } from 'react';
import type { PlayerCount } from './rules.ts';
import type { TournamentDraft, TournamentLoad } from './format.ts';
import './tournament.css';

interface TournamentProps {
  onLeave(): void;
}

export function TournamentScreen({ onLeave }: TournamentProps) {
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [pendingLoadText, setPendingLoadText] = useState<string | null>(null);
  const controller = useTournament(!leaveDialogOpen);
  const heading = useRef<HTMLHeadingElement>(null);
  const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
  const [names, setNames] = useState(() => Array<string>(8).fill(''));
  const [formError, setFormError] = useState('');
  const tournament = controller.tournament;
  const nowPlaying =
    tournament && (tournament.phase === 'ready' || tournament.phase === 'playing')
      ? `Now playing: ${currentPlayer(tournament)?.name ?? ''}`
      : '';
  const status = formError || controller.notice || nowPlaying;
  useEffect(() => heading.current?.focus(), []);

  function start(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const accepted = names.slice(0, playerCount).map(normalizeTournamentName);
    const error = validateTournamentNames(accepted);
    if (error) {
      setFormError(error);
      return;
    }
    const nextNames = [...names];
    accepted.forEach((name, index) => {
      nextNames[index] = name;
    });
    setNames(nextNames);
    setFormError('');
    controller.startTournament(accepted, playerCount);
  }

  function changeName(index: number, name: string): void {
    const next = [...names];
    next[index] = name;
    setNames(next);
    setFormError('');
    controller.clearNotice();
  }

  function restoreDraft(draft: TournamentDraft): void {
    setPlayerCount(draft.playerCount);
    setNames([...draft.names]);
    setFormError('');
  }

  function requestLeave(): void {
    if (!tournament) {
      onLeave();
      return;
    }
    controller.synchronizeClock();
    setLeaveDialogOpen(true);
  }

  function keepPlaying(): void {
    controller.resetClock();
    setPendingLoadText(null);
    setLeaveDialogOpen(false);
  }

  function leaveTournament(): void {
    const pending = pendingLoadText;
    setPendingLoadText(null);
    setLeaveDialogOpen(false);
    if (pending !== null) {
      const loaded = controller.loadTournament(pending);
      if (loaded?.kind === 'setup') restoreDraft(loaded.draft);
      return;
    }
    onLeave();
  }

  function loadTournament(text: string): TournamentLoad | null {
    setFormError('');
    const loaded = decodeTournamentFile(text);
    if (loaded && tournament && tournament.phase !== 'finished') {
      controller.synchronizeClock();
      setPendingLoadText(text);
      setLeaveDialogOpen(true);
      return null;
    }
    return controller.loadTournament(text);
  }

  return (
    <section className="tournament-screen" aria-labelledby="tournament-heading">
      <div className="tournament-heading-row">
        <h2 id="tournament-heading" ref={heading} tabIndex={-1}>
          Tournament
        </h2>
        {tournament?.phase !== 'finished' && (
          <button className="control" type="button" onClick={requestLeave}>
            Leave tournament
          </button>
        )}
      </div>
      <p className="tournament-notice" role="status" aria-live="polite" aria-atomic="true">
        {status}
      </p>
      {tournament ? (
        <TournamentLive
          tournament={tournament}
          startTurn={controller.startTurn}
          activate={controller.activate}
          nextTurn={controller.advanceToNextTurn}
          nextMatch={controller.advanceToNextMatch}
          onBack={onLeave}
        />
      ) : (
        <TournamentSetup
          playerCount={playerCount}
          names={names}
          error={formError}
          changeCount={setPlayerCount}
          changeName={changeName}
          submit={start}
        />
      )}
      <PastTournaments
        tournaments={controller.pastTournaments}
        storageAvailable={controller.storageAvailable}
      />
      <TournamentExchange
        draft={{ playerCount, names }}
        exportTournament={controller.exportTournament}
        loadTournament={loadTournament}
        onSetupLoaded={restoreDraft}
      />
      {leaveDialogOpen && (
        <TournamentLeaveDialog
          message={
            pendingLoadText === null
              ? 'Your unfinished tournament will be stopped.'
              : 'Your unfinished tournament will be stopped and replaced by the loaded tournament.'
          }
          keepPlaying={keepPlaying}
          leave={leaveTournament}
        />
      )}
    </section>
  );
}
