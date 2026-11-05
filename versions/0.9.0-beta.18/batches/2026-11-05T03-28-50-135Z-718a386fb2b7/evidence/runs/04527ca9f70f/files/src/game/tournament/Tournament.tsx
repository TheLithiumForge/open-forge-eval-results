import { useEffect, useRef, useState } from 'react';
import { decodeTournament } from './format.ts';
import { TournamentHistory } from './TournamentHistory.tsx';
import { TournamentPlay } from './TournamentPlay.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { TournamentConfirmation } from './TournamentConfirmation.tsx';
import { playerName } from './model.ts';
import { TournamentTools } from './TournamentTools.tsx';
import { useTournament } from './use-tournament.ts';
import './tournament.css';

interface TournamentProps {
  backToGame(): void;
}

export function Tournament({ backToGame }: TournamentProps) {
  const controller = useTournament();
  const [count, setCount] = useState(4);
  const [names, setNames] = useState<string[]>(Array.from({ length: 8 }, () => ''));
  const [json, setJson] = useState('');
  const [setupNotice, setSetupNotice] = useState('');
  const [setupAnnouncement, setSetupAnnouncement] = useState(0);
  const [confirmation, setConfirmation] = useState<'leave' | 'load' | null>(null);
  const [pendingLoad, setPendingLoad] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  const tournament = controller.tournament;
  const match = tournament?.matches[tournament.currentMatch];
  const player = tournament
    ? playerName(tournament, match?.playerSeeds[tournament.currentTurn] ?? null)
    : '';
  const currentResult = match?.results[tournament?.currentTurn ?? 0] ?? null;
  const turnStatus =
    tournament && match
      ? currentResult && tournament.currentTurn === 0
        ? `Turn complete: ${player}. Next up: ${playerName(tournament, match.playerSeeds[1])}`
        : currentResult
          ? `Match complete. Winner: ${playerName(tournament, match.winnerSeed)}`
          : `Now playing: ${player}`
      : '';
  const statusText =
    setupNotice ||
    (tournament?.status === 'finished'
      ? `Champion: ${playerName(tournament, tournament.championSeed)}${controller.feedback ? `. ${controller.feedback}` : ''}${controller.notice ? `. ${controller.notice}` : ''}`
      : `${turnStatus}${controller.feedback ? `. ${controller.feedback}` : ''}${controller.notice ? `. ${controller.notice}` : ''}`);
  const statusKey = `${controller.announcement}-${setupAnnouncement}-${tournament?.currentMatch ?? ''}-${tournament?.currentTurn ?? ''}-${tournament?.status ?? ''}`;

  function updateName(index: number, name: string): void {
    setNames((previous) => previous.map((value, item) => (item === index ? name : value)));
  }

  function applyLoad(text: string): void {
    setSetupNotice('');
    const loaded = controller.load(text);
    if (loaded?.kind === 'setup') {
      setCount(loaded.count);
      setNames([...loaded.names]);
    }
  }

  function requestLeave(): void {
    controller.pauseClock();
    setConfirmation('leave');
  }

  function requestLoad(): void {
    if (!decodeTournament(json)) {
      applyLoad(json);
      return;
    }
    if (controller.tournament?.status === 'active') {
      controller.pauseClock();
      setPendingLoad(json);
      setConfirmation('load');
      return;
    }
    applyLoad(json);
  }

  function confirmAction(): void {
    if (confirmation === 'leave') {
      controller.discard();
      backToGame();
    } else if (confirmation === 'load' && pendingLoad) {
      controller.resumeClock();
      applyLoad(pendingLoad);
      setPendingLoad('');
    }
  }

  function closeConfirmation(): void {
    setConfirmation(null);
    setPendingLoad('');
    controller.resumeClock();
  }

  return (
    <section className="tournament-screen" aria-labelledby="tournament-heading">
      <h2 id="tournament-heading" ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      <p className="intro">Take turns on the same deal. The player with fewer moves advances.</p>
      <div
        className={`game-result tournament-live-status ${tournament?.status === 'finished' ? 'tournament-live-champion' : ''}`}
      >
        <p id="tournament-status" role="status" aria-live="polite" aria-atomic="true">
          <span key={statusKey}>
            {tournament?.status === 'active' && match && (
              <>
                Round: {match.round}
                <br />
              </>
            )}
            {statusText}
          </span>
        </p>
      </div>
      {controller.tournament ? (
        <TournamentPlay
          tournament={controller.tournament}
          activate={controller.activate}
          startTurn={controller.beginTurn}
          nextTurn={controller.continueTurn}
          nextMatch={controller.continueMatch}
          leave={requestLeave}
          backToGame={backToGame}
        />
      ) : (
        <TournamentSetup
          count={count}
          names={names}
          notice={setupNotice}
          onCount={(value) => {
            setSetupNotice('');
            setCount(value);
          }}
          onName={(index, name) => {
            setSetupNotice('');
            updateName(index, name);
          }}
          onNotice={(message) => {
            setSetupNotice(message);
            setSetupAnnouncement((value) => value + 1);
          }}
          onStart={controller.begin}
          backToGame={backToGame}
        />
      )}
      <TournamentTools
        json={json}
        hasNotice={controller.notice !== ''}
        onJson={setJson}
        onExport={() => setJson(controller.exportCurrent(count, names))}
        onLoad={requestLoad}
      />
      <TournamentHistory
        records={controller.history}
        storageAvailable={controller.storageAvailable}
      />
      <TournamentConfirmation
        action={confirmation}
        onClose={closeConfirmation}
        onConfirm={confirmAction}
      />
    </section>
  );
}
