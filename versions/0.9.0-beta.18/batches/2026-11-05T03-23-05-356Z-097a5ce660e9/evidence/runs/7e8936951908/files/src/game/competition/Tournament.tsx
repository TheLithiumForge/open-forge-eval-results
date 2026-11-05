import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { isWon } from '../game.ts';
import { useGame } from '../session/use-game.ts';
import { PastTournaments } from './PastTournaments.tsx';
import { TournamentCurrent } from './TournamentCurrent.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { useTournament } from './use-tournament.ts';
import './tournament.css';

export function TournamentScreen({
  onBack,
  headingRef,
}: {
  readonly onBack: () => void;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const controller = useGame({ savePreferences: false });
  const manager = useTournament();
  const actionButton = useRef<HTMLButtonElement>(null);
  const focusReadyAction = useRef(false);
  const skipPhaseFocus = useRef(false);
  const tournament = manager.tournament;
  const { session } = controller;

  useEffect(() => {
    if (tournament?.phase === 'playing' && isWon(session.game)) manager.finishTurn(session.game);
  }, [session.game, tournament]);

  useEffect(() => {
    if (!tournament) return;
    if (tournament.phase === 'ready' && focusReadyAction.current) {
      focusReadyAction.current = false;
      actionButton.current?.focus();
    } else if (tournament.phase === 'turn-finished' || tournament.phase === 'match-finished') {
      if (skipPhaseFocus.current) skipPhaseFocus.current = false;
      else if (document.activeElement !== actionButton.current) actionButton.current?.focus();
    }
  }, [tournament]);

  function startTurn(): void {
    const match = manager.startTurn();
    if (match) controller.loadBoard(match.boardCode);
  }

  function startTournament(): void {
    if (manager.startTournament()) focusReadyAction.current = true;
  }

  function leaveTournament(): void {
    manager.leaveTournament();
    onBack();
  }

  function loadTournament(): void {
    const loaded = manager.loadJson();
    if (loaded?.kind === 'tournament') {
      skipPhaseFocus.current =
        loaded.phase === 'turn-finished' ||
        loaded.phase === 'match-finished' ||
        (loaded.phase === 'playing' && loaded.game !== null && isWon(loaded.game));
    }
    if (loaded?.kind === 'tournament') {
      if (loaded.game) controller.restoreTournamentGame(loaded.game);
      else controller.loadBoard(loaded.boardCode);
    }
  }

  function exportTournament(): void {
    manager.exportJson(controller.exportSnapshot());
  }

  return (
    <section className="tournament-screen" aria-labelledby="tournament-title">
      <h2 id="tournament-title" ref={headingRef} tabIndex={-1}>
        Tournament
      </h2>
      {!tournament ? (
        <>
          <TournamentSetup
            playerCount={manager.playerCount}
            names={manager.names}
            setPlayerCount={manager.setPlayerCount}
            editName={manager.editName}
            startTournament={startTournament}
          />
          <button type="button" className="control tournament-back" onClick={onBack}>
            Back to game
          </button>
        </>
      ) : (
        <TournamentCurrent
          tournament={tournament}
          session={session}
          actionButton={actionButton}
          activate={controller.activate}
          startTurn={startTurn}
          nextTurn={manager.nextTurn}
          nextMatch={manager.nextMatch}
          leaveTournament={leaveTournament}
          onBack={onBack}
        />
      )}
      {manager.notice && (
        <p className="tournament-notice" role="status">
          {manager.notice}
        </p>
      )}
      <PastTournaments tournaments={manager.past} storageNotice={manager.storageNotice} />
      <section className="tournament-transfer" aria-label="Tournament data">
        <h3>Tournament data</h3>
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          id="tournament-json"
          className="control"
          value={manager.json}
          maxLength={65_536}
          rows={8}
          spellCheck={false}
          onChange={(event) => manager.setJson(event.currentTarget.value)}
        />
        <div className="tournament-actions">
          <button type="button" className="control" onClick={exportTournament}>
            Export tournament
          </button>
          <button type="button" className="control" onClick={loadTournament}>
            Load tournament
          </button>
        </div>
      </section>
    </section>
  );
}
