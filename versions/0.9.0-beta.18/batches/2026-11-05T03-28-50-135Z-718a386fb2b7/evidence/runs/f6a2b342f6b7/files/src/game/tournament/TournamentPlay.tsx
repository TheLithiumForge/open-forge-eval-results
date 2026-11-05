import { useLayoutEffect, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { formatElapsed } from '../elapsed-time.ts';
import { GameStatus } from '../status/GameStatus.tsx';
import { TournamentBracket } from './TournamentBracket.tsx';
import type { Tournament } from './types.ts';

interface TournamentPlayProps {
  tournament: Tournament;
  activate(index: number): void;
  startTurn(): void;
  nextTurn(): void;
  nextMatch(): void;
  leave(): void;
}

export function TournamentPlay({
  tournament,
  activate,
  startTurn,
  nextTurn,
  nextMatch,
  leave,
}: TournamentPlayProps) {
  const board = useRef<BoardFocus>(null);
  const hadGame = useRef(false);
  const match = tournament.matches[tournament.currentMatch];
  const player = match?.players[tournament.currentTurn] ?? null;

  useLayoutEffect(() => {
    const hasGame = tournament.game !== null;
    if (hasGame && !hadGame.current) board.current?.focusRemembered();
    hadGame.current = hasGame;
  }, [tournament.game !== null]);
  const roundHeading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(
    () => roundHeading.current?.focus(),
    [tournament.currentMatch, tournament.currentTurn],
  );

  if (!match) return null;
  const boardKey = `${tournament.currentMatch}-${tournament.currentTurn}-${match.boardCode}`;
  const roundMatches = tournament.matches.filter((entry) => entry.round === match.round);
  const roundMatchNumber =
    tournament.matches
      .slice(0, tournament.currentMatch)
      .filter((entry) => entry.round === match.round).length + 1;
  const firstTurnDone = tournament.currentTurn === 0 && match.results[0] !== null;
  const result = match.results[tournament.currentTurn];
  const announcement = tournament.champion
    ? `Tournament complete. Champion: ${tournament.champion.name}.`
    : match.winner
      ? `${match.winner.name} wins the match.`
      : result && player
        ? `${player.name} completed in ${result.moves} moves and ${formatElapsed(result.elapsedMs)}.`
        : player
          ? `Now playing: ${player.name}.`
          : '';

  return (
    <section className="tournament-play" aria-labelledby="tournament-round-heading">
      <p className="tournament-round">Round: {match.round}</p>
      <h3 id="tournament-round-heading" ref={roundHeading} tabIndex={-1}>
        Match {roundMatchNumber} of {roundMatches.length}
      </h3>
      <p className="tournament-deal">Deal: {match.boardCode}</p>
      {!tournament.champion && !match.winner && player && (
        <p className="tournament-now-playing">Now playing: {player.name}</p>
      )}
      <p className="tournament-announcement" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      {tournament.game && (
        <>
          <GameStatus
            game={tournament.game}
            best={undefined}
            celebration={false}
            showBest={false}
          />
          <p id="tournament-board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <Board key={boardKey} game={tournament.game} activate={activate} ref={board} />
        </>
      )}
      <div className="tournament-actions">
        {!match.winner && !tournament.game && player && (
          <button type="button" className="control" onClick={startTurn}>
            Start turn
          </button>
        )}
        {firstTurnDone && (
          <button type="button" className="control" onClick={nextTurn}>
            Next turn
          </button>
        )}
        {match.winner && !tournament.champion && (
          <button type="button" className="control" onClick={nextMatch}>
            Next match
          </button>
        )}
        {!tournament.champion && (
          <button type="button" className="control" onClick={leave}>
            Leave tournament
          </button>
        )}
      </div>
      <TournamentBracket tournament={tournament} />
    </section>
  );
}
