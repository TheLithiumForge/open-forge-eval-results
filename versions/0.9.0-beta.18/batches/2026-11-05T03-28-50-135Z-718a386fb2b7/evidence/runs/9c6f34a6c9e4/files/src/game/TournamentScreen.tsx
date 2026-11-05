import { useEffect, useRef } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { formatElapsed } from './elapsed-time.ts';
import { GameStatus } from './status/GameStatus.tsx';
import { currentTournamentMatch } from './tournament.ts';
import { TournamentBracket } from './TournamentBracket.tsx';
import { PastTournaments } from './PastTournaments.tsx';
import { TournamentJson, TournamentSetup } from './TournamentForms.tsx';
import { useTournament } from './use-tournament.ts';
import { isWon } from './game.ts';
import './tournament.css';

interface TournamentScreenProps {
  size: number;
  boardCode: string;
  backToGame(): void;
}

export function TournamentScreen({ size, boardCode, backToGame }: TournamentScreenProps) {
  const controller = useTournament(size, boardCode);
  const board = useRef<BoardFocus>(null);
  const { tournament, session } = controller;
  const match = tournament?.status === 'active' ? currentTournamentMatch(tournament) : null;
  const playerId = match?.players[tournament?.turn ?? 0] ?? null;
  const playerName = playerId === null ? '' : (tournament?.players[playerId]?.name ?? '');
  const turnResult = match?.results[tournament?.turn ?? 0] ?? null;
  const resultReady = turnResult !== null;
  const showBoard = Boolean(
    tournament?.status === 'active' &&
    (controller.turnReady || session.game.started || isWon(session.game)),
  );
  useEffect(() => {
    if (showBoard) board.current?.focusRemembered();
  }, [session.generation, showBoard]);

  return (
    <section className="tournament-screen" aria-labelledby="tournament-title">
      <h2 id="tournament-title">Tournament</h2>
      <p className="tournament-intro">
        Each match uses one shared deal. Fewer moves wins; ties go to the faster time, then the
        first player shown.
      </p>
      {tournament === null && <TournamentSetup controller={controller} />}
      {tournament === null && (
        <button type="button" className="control tournament-action" onClick={backToGame}>
          Back to game
        </button>
      )}
      {tournament?.status === 'active' && match && (
        <>
          <p className="now-playing" role="status" aria-live="polite" aria-atomic="true">
            Now playing: {playerName}
          </p>
          <p className="match-heading">
            {roundLabel(tournament.currentRound, tournament.rounds.length)} · Match{' '}
            {tournament.currentMatch + 1}
          </p>
          {turnResult && (
            <p className="turn-complete" role="status" aria-live="polite">
              {playerName} finished in {turnResult.moves} moves and{' '}
              {formatElapsed(turnResult.elapsedMs)}.
            </p>
          )}
          {!resultReady && !showBoard && (
            <button type="button" className="control" onClick={controller.startTurn}>
              Start turn
            </button>
          )}
          {showBoard && (
            <>
              <p id="tournament-board-help" className="help">
                Reveal two cards. Match their shape and marker to keep the pair.
              </p>
              <GameStatus
                game={session.game}
                best={undefined}
                celebration={false}
                showBest={false}
              />
              <Board
                key={session.generation}
                game={session.game}
                helpId="tournament-board-help"
                activate={controller.activate}
                ref={board}
              />
            </>
          )}
          {tournament.turn === 0 && match.results[0] && (
            <button
              type="button"
              className="control tournament-action"
              onClick={controller.nextTurn}
            >
              Next turn
            </button>
          )}
          {tournament.turn === 1 && match.results[1] && (
            <button
              type="button"
              className="control tournament-action"
              onClick={controller.nextMatch}
            >
              Next match
            </button>
          )}
          <button type="button" className="control tournament-action" onClick={backToGame}>
            Leave tournament
          </button>
        </>
      )}
      {tournament?.status === 'complete' && (
        <>
          <p className="champion" role="status">
            Champion: {tournament.players[tournament.championId ?? -1]?.name ?? ''}
          </p>
          <button type="button" className="control tournament-action" onClick={backToGame}>
            Back to game
          </button>
        </>
      )}
      {tournament && <TournamentBracket tournament={tournament} game={session.game} />}
      <p className="tournament-notice" role="status" aria-live="polite">
        {controller.notice}
      </p>
      <TournamentJson controller={controller} />
      <PastTournaments tournaments={controller.past} />
    </section>
  );
}

function roundLabel(round: number, total: number): string {
  const remaining = total - round;
  return remaining === 1 ? 'Final' : remaining === 2 ? 'Semi-finals' : 'Quarter-finals';
}
