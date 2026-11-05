import { useEffect, useRef, useState } from 'react';
import { TournamentBracket } from './TournamentBracket.tsx';
import { TournamentExchange } from './TournamentExchange.tsx';
import { TournamentHistory } from './TournamentHistory.tsx';
import { TournamentPlay } from './TournamentPlay.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import type { TournamentPlayerCount, TournamentSetup as SetupData } from './types.ts';
import type { useTournament } from '../session/use-tournament.ts';
import '../controls/control.css';
import './tournament.css';

interface TournamentProps {
  readonly controller: ReturnType<typeof useTournament>;
  onReturnToGame(): void;
}

export function Tournament({ controller, onReturnToGame }: TournamentProps) {
  const [playerCount, setPlayerCount] = useState<TournamentPlayerCount>(4);
  const [names, setNames] = useState<readonly string[]>(() => Array.from({ length: 8 }, () => ''));
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState('');
  const [announcement, setAnnouncement] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  function publish(message: string): void {
    setNotice(message);
    setAnnouncement((value) => value + 1);
  }

  function changeName(index: number, value: string): void {
    setNames((current) =>
      current.map((name, currentIndex) => (currentIndex === index ? value : name)),
    );
  }

  function start(): void {
    const error = controller.start(playerCount, names);
    if (error) publish(error);
    else publish('');
  }

  function startTurn(): void {
    controller.startTurn();
    publish('');
  }

  function nextTurn(): void {
    controller.nextTurn();
    publish('');
  }

  function nextMatch(): void {
    controller.nextMatch();
    publish('');
  }

  function exportTournament(): string {
    const setup: SetupData = { playerCount, names };
    const exported = controller.exportJson(setup);
    setJson(exported);
    publish('Tournament exported.');
    return exported;
  }

  function loadTournament(text: string): void {
    const loaded = controller.loadJson(text);
    if (loaded.kind === 'invalid') {
      publish(loaded.message);
      return;
    }
    if (loaded.kind === 'setup') {
      setPlayerCount(loaded.setup.playerCount);
      setNames(loaded.setup.names);
      publish('Tournament setup loaded.');
    } else {
      setPlayerCount(loaded.tournament.playerCount);
      setNames((current) =>
        current.map((_, index) => loaded.tournament.players[index]?.name ?? ''),
      );
      publish('Tournament loaded.');
    }
  }

  function returnToGame(): void {
    onReturnToGame();
  }

  const tournament = controller.tournament;
  return (
    <main className="tournament-screen">
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <h2 ref={heading} tabIndex={-1} className="tournament-screen-heading">
        Tournament
      </h2>
      <p className="intro">
        Take turns on the same deal. Fewer moves advances; a tie goes to faster active time, then
        earlier entry.
      </p>
      {tournament ? (
        <>
          <TournamentPlay
            tournament={tournament}
            statusNotice={notice}
            announcement={announcement}
            onStartTurn={startTurn}
            onNextTurn={nextTurn}
            onNextMatch={nextMatch}
            onLeave={returnToGame}
            onBackToGame={returnToGame}
            onActivate={controller.activate}
          />
          <TournamentBracket players={tournament.players} matches={tournament.matches} />
        </>
      ) : (
        <>
          <div className="tournament-status">
            <p role="status" aria-live="polite" aria-atomic="true">
              <span key={announcement}>{notice}</span>
            </p>
          </div>
          <TournamentSetup
            playerCount={playerCount}
            names={names}
            onPlayerCountChange={setPlayerCount}
            onNameChange={changeName}
            onStart={start}
            onBack={returnToGame}
          />
        </>
      )}
      <TournamentExchange
        value={json}
        onChange={setJson}
        onExport={exportTournament}
        onLoad={loadTournament}
      />
      <TournamentHistory
        tournaments={controller.past}
        storageAvailable={controller.storageAvailable}
      />
    </main>
  );
}
