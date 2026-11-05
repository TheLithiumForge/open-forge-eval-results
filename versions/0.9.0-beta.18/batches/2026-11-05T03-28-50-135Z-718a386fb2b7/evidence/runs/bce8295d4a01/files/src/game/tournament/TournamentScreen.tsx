import { useCallback, useEffect, useRef, useState } from 'react';
import { decodeTournament, encodeTournament } from './format.ts';
import { hasUniquePlayerNames, hasValidPlayerNames, normalizePlayerName } from './names.ts';
import { GameResult } from '../GameResult.tsx';
import { TournamentCurrent } from './TournamentCurrent.tsx';
import { TournamentEntry } from './TournamentEntry.tsx';
import { TournamentHistory } from './TournamentHistory.tsx';
import { TournamentJsonPanel } from './TournamentJsonPanel.tsx';
import { useTournamentHistory } from './use-history.ts';
import { useTournament } from './use-tournament.ts';
import type { TournamentPlayer, TournamentState } from './types.ts';
import './tournament.css';

interface TournamentScreenProps {
  readonly status: { readonly text: string; readonly sequence: number };
  onBack(): void;
  announce(text: string): void;
}

export function TournamentScreen({ status, onBack, announce }: TournamentScreenProps) {
  const history = useTournamentHistory();
  const onComplete = useCallback(
    (tournament: TournamentState) => history.add(tournament),
    [history.add],
  );
  const tournamentController = useTournament({ announce, onComplete });
  const { tournament, controller } = tournamentController;
  const [playerCount, setPlayerCount] = useState(4);
  const [names, setNames] = useState(() => Array.from({ length: 8 }, () => ''));
  const [entryNotice, setEntryNotice] = useState('');
  const [focusStart, setFocusStart] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    heading.current?.focus();
    announce('Tournament setup.');
  }, [announce]);
  useEffect(() => {
    if (!focusStart || !tournament) return;
    startButton.current?.focus();
    setFocusStart(false);
  }, [focusStart, tournament]);

  function changeName(index: number, value: string): void {
    setNames((current) => current.map((name, position) => (position === index ? value : name)));
  }

  function startTournament(): void {
    const acceptedNames = names.slice(0, playerCount).map(normalizePlayerName);
    if (!hasValidPlayerNames(acceptedNames)) {
      setEntryNotice('Use 2 to 20 characters.');
      announce('Use 2 to 20 characters.');
      return;
    }
    if (!hasUniquePlayerNames(acceptedNames)) {
      setEntryNotice('Each name must be different.');
      announce('Each name must be different.');
      return;
    }
    const players: TournamentPlayer[] = acceptedNames.map((name, index) => ({
      name,
      seed: index + 1,
    }));
    setEntryNotice('');
    tournamentController.start(players);
    setFocusStart(true);
  }

  const exportText = useCallback((): string | null => {
    const source = tournament ?? history.items[0];
    if (!source) return null;
    const snapshot = tournament?.phase === 'playing' ? controller.exportSnapshot() : null;
    return encodeTournament(source, snapshot);
  }, [controller, history.items, tournament]);

  const loadText = useCallback(
    (text: string) => {
      const decoded = decodeTournament(text);
      if (!decoded.ok) return { ok: false, message: decoded.message };
      if (!tournamentController.load(decoded.tournament))
        return { ok: false, message: 'Invalid tournament.' };
      return { ok: true, message: 'Tournament loaded.' };
    },
    [tournamentController],
  );

  return (
    <section className="tournament-screen" aria-labelledby="tournament-heading">
      <h2 id="tournament-heading" ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      <GameResult
        {...status}
        {...(status.text.startsWith('Now playing:') ? { className: 'tournament-now-playing' } : {})}
      />
      {!tournament && (
        <>
          <p className="tournament-intro">Enter 4 or 8 players to set up a knockout bracket.</p>
          <TournamentEntry
            playerCount={playerCount}
            names={names}
            notice={entryNotice}
            onPlayerCountChange={setPlayerCount}
            onNameChange={changeName}
            onStart={startTournament}
          />
          <button type="button" className="control tournament-exit" onClick={onBack}>
            Back to game
          </button>
        </>
      )}
      {tournament && (
        <TournamentCurrent
          tournament={tournament}
          game={controller.session.game}
          generation={controller.session.generation}
          celebration={controller.session.celebration}
          startButton={startButton}
          activate={controller.activate}
          startTurn={tournamentController.startTurn}
          nextMatch={tournamentController.nextMatch}
          back={onBack}
        />
      )}
      <TournamentJsonPanel exportText={exportText} loadText={loadText} announce={announce} />
      <TournamentHistory items={history.items} available={history.available} />
    </section>
  );
}
