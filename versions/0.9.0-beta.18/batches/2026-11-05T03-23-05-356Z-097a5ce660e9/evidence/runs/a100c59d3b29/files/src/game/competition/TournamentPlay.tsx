import { useEffect, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { StatusLabel } from '../status/status-labels.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { TournamentLeaveDialog } from './TournamentLeaveDialog.tsx';
import type { TournamentState } from './types.ts';

interface TournamentPlayProps {
  readonly tournament: TournamentState;
  readonly statusNotice: string;
  readonly announcement: number;
  onStartTurn(): void;
  onNextTurn(): void;
  onNextMatch(): void;
  onLeave(): void;
  onBackToGame(): void;
  onActivate(index: number): void;
}

export function TournamentPlay({
  tournament,
  statusNotice,
  announcement,
  onStartTurn,
  onNextTurn,
  onNextMatch,
  onLeave,
  onBackToGame,
  onActivate,
}: TournamentPlayProps) {
  const board = useRef<BoardFocus>(null);
  const actionButton = useRef<HTMLButtonElement>(null);
  const previousPhase = useRef(tournament.phase);
  const match = tournament.matches[tournament.activeMatch];
  const seed = match?.players[tournament.turnIndex];
  const player = tournament.players.find((candidate) => candidate.seed === seed);
  const name = player?.name ?? 'Player';
  const final = tournament.matches[tournament.matches.length - 1];
  const champion = tournament.players.find((candidate) => candidate.seed === final?.winnerSeed);

  useEffect(() => {
    if (tournament.phase === 'ready' && !statusNotice) {
      actionButton.current?.focus();
    } else if (previousPhase.current === 'ready' && tournament.phase === 'playing') {
      board.current?.focusRemembered();
    } else if (previousPhase.current === 'playing' && tournament.phase !== 'playing') {
      actionButton.current?.focus();
    }
    previousPhase.current = tournament.phase;
  }, [tournament.phase, statusNotice]);

  if (!match) return null;
  const action =
    tournament.phase === 'ready'
      ? { label: 'Start turn', run: onStartTurn }
      : tournament.phase === 'between-turns'
        ? { label: 'Next turn', run: onNextTurn }
        : tournament.phase === 'between-matches'
          ? { label: 'Next match', run: onNextMatch }
          : tournament.phase === 'finished'
            ? { label: 'Back to game', run: onBackToGame }
            : null;
  const matchWinner = match.winnerSeed
    ? tournament.players.find((candidate) => candidate.seed === match.winnerSeed)
    : undefined;
  const showBoard = tournament.phase === 'playing';
  const statusKind =
    tournament.phase === 'ready'
      ? 'ready'
      : tournament.phase === 'playing'
        ? 'playing'
        : tournament.phase === 'between-turns'
          ? 'turn-complete'
          : tournament.phase === 'between-matches'
            ? 'match-complete'
            : 'champion';
  const phaseText =
    statusKind === 'ready'
      ? `Ready for: ${name}`
      : statusKind === 'playing'
        ? `Now playing: ${name}`
        : statusKind === 'turn-complete'
          ? `Turn complete: ${name}`
          : statusKind === 'match-complete'
            ? `Match winner: ${matchWinner?.name ?? 'Unknown'}`
            : `Champion: ${champion?.name ?? 'Unknown'}`;
  const statusText = statusNotice ? `${statusNotice} ${phaseText}` : phaseText;
  const statusKey = statusNotice
    ? `notice-${announcement}`
    : `${tournament.activeMatch}-${tournament.turnIndex}-${statusKind}`;

  return (
    <section className="tournament-play" aria-labelledby="tournament-play-heading">
      <h3 id="tournament-play-heading">Current match</h3>
      <p>Round: {match.round}</p>
      <div className="tournament-status">
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={tournament.phase === 'finished' && !statusNotice ? 'tournament-champion' : ''}
        >
          <span key={statusKey}>{statusText}</span>
        </p>
      </div>
      <p className="tournament-deal-code">Deal: {match.boardCode}</p>
      <div className="tournament-stats" aria-label="Current game results">
        <dl>
          <div>
            <dt>{StatusLabel.moves}</dt>
            <dd>{tournament.game.moves}</dd>
          </div>
          <div>
            <dt>{StatusLabel.pairs}</dt>
            <dd>
              {tournament.game.matched.length / 2}/{tournament.game.deck.length / 2}
            </dd>
          </div>
          <div>
            <dt>{StatusLabel.time}</dt>
            <dd>{formatElapsed(tournament.game.elapsedMs)}</dd>
          </div>
        </dl>
      </div>
      <div className="tournament-actions">
        {action && (
          <button ref={actionButton} type="button" className="control" onClick={action.run}>
            {action.label}
          </button>
        )}
        <TournamentLeaveDialog visible={tournament.phase !== 'finished'} onLeave={onLeave} />
      </div>
      {showBoard && (
        <>
          <p id="board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <Board
            key={`${match.id}-${tournament.turnIndex}`}
            game={tournament.game}
            activate={onActivate}
            ref={board}
          />
        </>
      )}
    </section>
  );
}
