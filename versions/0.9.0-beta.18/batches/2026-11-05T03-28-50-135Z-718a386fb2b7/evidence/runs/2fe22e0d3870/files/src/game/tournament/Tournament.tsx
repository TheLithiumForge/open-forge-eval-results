import { useEffect, useRef, useState } from 'react';
import { TournamentHistory } from './TournamentHistory.tsx';
import { TournamentExchange } from './TournamentExchange.tsx';
import { TournamentConfirmDialog } from './TournamentConfirmDialog.tsx';
import { TournamentPlay } from './TournamentPlay.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { useTournament } from '../session/use-tournament.ts';
import { validateNames } from './names.ts';
import { useTournamentAnnouncements } from './use-tournament-announcements.ts';
import type { TournamentLoad } from './format-read.ts';
import './tournament.css';

interface TournamentProps {
  backToGame(): void;
}

const emptyNames = () => Array.from({ length: 8 }, () => '');

export function Tournament({ backToGame }: TournamentProps) {
  const controller = useTournament();
  const heading = useRef<HTMLHeadingElement>(null);
  const [playerCount, setPlayerCount] = useState<4 | 8>(4);
  const [names, setNames] = useState<string[]>(emptyNames);
  const [json, setJson] = useState('');
  const [setupMessage, setSetupMessage] = useState('');
  const [exchangeMessage, setExchangeMessage] = useState('');
  const [pending, setPending] = useState<TournamentLoad | 'leave' | null>(null);
  const [playGeneration, setPlayGeneration] = useState(0);
  const { announce, announcement, announcementId } = useTournamentAnnouncements(
    controller.tournament,
    playGeneration,
  );

  useEffect(() => {
    heading.current?.focus();
  }, []);
  function changeName(index: number, name: string): void {
    setNames((values) => values.map((value, position) => (position === index ? name : value)));
  }

  function start(): void {
    const checked = validateNames(names, playerCount);
    setSetupMessage(checked.error);
    if (checked.error) {
      announce(checked.error);
      return;
    }
    if (controller.start(checked.names, playerCount)) {
      setNames((values) => values.map((value, index) => checked.names[index] ?? value));
      setSetupMessage('');
      setExchangeMessage('');
    }
  }

  function exportTournament(): void {
    setJson(controller.exportCurrent({ names, playerCount }));
  }

  function restore(value: TournamentLoad): void {
    setPlayGeneration((generation) => generation + 1);
    setSetupMessage('');
    setPlayerCount(value.kind === 'setup' ? value.draft.playerCount : value.state.playerCount);
    setNames(
      value.kind === 'setup'
        ? [...value.draft.names, ...emptyNames()].slice(0, 8)
        : [...value.state.players.map((player) => player.name), ...emptyNames()].slice(0, 8),
    );
    controller.restore(value);
    setExchangeMessage('Tournament loaded.');
    announce('Tournament loaded.');
  }

  function loadTournament(): void {
    const loaded = controller.decode(json);
    if (!loaded) {
      setExchangeMessage('Invalid tournament.');
      announce('Invalid tournament.');
      return;
    }
    if (controller.tournament?.status === 'playing') setPending(loaded);
    else restore(loaded);
  }

  function closeDecision(): void {
    setPending(null);
  }

  function confirmDecision(): void {
    const selected = pending;
    setPending(null);
    if (selected === 'leave') {
      controller.leave();
      backToGame();
    } else if (selected) restore(selected);
  }

  return (
    <section className="tournament-screen" aria-labelledby="tournament-title">
      <h2 id="tournament-title" ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      <p className="tournament-live" role="status" aria-live="polite" aria-atomic="true">
        <span key={announcementId}>{announcement}</span>
      </p>
      {!controller.tournament ? (
        <TournamentSetup
          count={playerCount}
          names={names}
          changeCount={setPlayerCount}
          changeName={changeName}
          start={start}
          back={backToGame}
          message={setupMessage}
        />
      ) : (
        <TournamentPlay
          key={playGeneration}
          tournament={controller.tournament}
          activate={controller.activate}
          startTurn={controller.beginTurn}
          nextTurn={controller.continueTurn}
          nextMatch={controller.continueMatch}
          back={backToGame}
          leave={() => setPending('leave')}
        />
      )}
      <TournamentHistory items={controller.past} available={controller.storageAvailable} />
      <TournamentExchange
        value={json}
        change={setJson}
        exportTournament={exportTournament}
        loadTournament={loadTournament}
        notice={exchangeMessage}
      />
      <TournamentConfirmDialog pending={pending} cancel={closeDecision} confirm={confirmDecision} />
    </section>
  );
}
