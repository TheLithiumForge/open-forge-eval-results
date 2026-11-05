import { useRef } from 'react';
import type { RefObject } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { TournamentBracket } from './TournamentBracket.tsx';
import { tournamentPlayer, activeTournamentMatch } from './tournament.ts';
import type { Tournament } from './tournament.ts';
import type { Session } from '../session/session.ts';

interface TournamentCurrentProps {
  readonly tournament: Tournament;
  readonly session: Session;
  readonly actionButton: RefObject<HTMLButtonElement | null>;
  activate(index: number): void;
  startTurn(): void;
  nextTurn(): void;
  nextMatch(): void;
  leaveTournament(): void;
  onBack(): void;
}

export function TournamentCurrent({
  tournament,
  session,
  actionButton,
  activate,
  startTurn,
  nextTurn,
  nextMatch,
  leaveTournament,
  onBack,
}: TournamentCurrentProps) {
  const board = useRef<BoardFocus>(null);
  const match = activeTournamentMatch(tournament);
  const playerSeed =
    tournament.phase === 'turn-finished'
      ? (match?.players[1] ?? null)
      : (match?.players[tournament.turn] ?? null);
  const player = tournamentPlayer(tournament, playerSeed);
  const resultAnnouncement = session.game.boardCode === match?.boardCode && session.feedback;

  function runTournamentAction(): void {
    if (tournament.phase === 'playing') return;
    if (tournament.phase === 'ready') startTurn();
    else if (tournament.phase === 'turn-finished') nextTurn();
    else if (tournament.phase === 'match-finished') nextMatch();
    else onBack();
  }

  return (
    <section className="tournament-current">
      <div className="tournament-turn">
        <div
          className={
            tournament.phase === 'finished' ? 'tournament-champion' : 'tournament-turn-info'
          }
        >
          {tournament.phase === 'finished' ? (
            <h2>Champion: {tournamentPlayer(tournament, tournament.champion)?.name}</h2>
          ) : (
            <>
              {match && <p>Round: {match.stage}</p>}
              {player && tournament.phase !== 'match-finished' && (
                <h2>Now playing: {player.name}</h2>
              )}
            </>
          )}
        </div>
        <div className="tournament-actions">
          <button
            ref={actionButton}
            type="button"
            className="control"
            aria-disabled={tournament.phase === 'playing'}
            onClick={runTournamentAction}
          >
            {tournament.phase === 'ready'
              ? 'Start turn'
              : tournament.phase === 'playing'
                ? 'Turn in progress'
                : tournament.phase === 'turn-finished'
                  ? 'Next turn'
                  : tournament.phase === 'match-finished'
                    ? 'Next match'
                    : 'Back to game'}
          </button>
          {tournament.phase !== 'finished' && (
            <button type="button" className="control" onClick={leaveTournament}>
              Leave tournament
            </button>
          )}
        </div>
      </div>
      {tournament.phase === 'playing' && (
        <>
          <GameStatus
            game={session.game}
            best={undefined}
            celebration={session.celebration}
            showBest={false}
          />
          <p id="tournament-board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <Board
            key={session.generation}
            game={session.game}
            helpId="tournament-board-help"
            activate={activate}
            ref={board}
          />
        </>
      )}
      {resultAnnouncement &&
        (tournament.phase === 'playing' ||
          tournament.phase === 'turn-finished' ||
          tournament.phase === 'match-finished') && (
          <div className="game-result">
            <p role="status" aria-live="polite" aria-atomic="true">
              <span key={session.announcement}>{resultAnnouncement}</span>
            </p>
          </div>
        )}
      <TournamentBracket tournament={tournament} />
    </section>
  );
}
