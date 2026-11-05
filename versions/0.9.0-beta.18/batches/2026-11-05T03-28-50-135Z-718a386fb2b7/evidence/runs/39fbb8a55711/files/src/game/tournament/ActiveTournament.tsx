import { useEffect, useRef, useState } from 'react';
import { activateCard, createGame, isWon } from '../game.ts';
import { parseBoardCode } from '../deck.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { initialSession, replaceGame } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import { BracketTable } from './BracketTable.tsx';
import { ActiveTournamentBoard } from './ActiveTournamentBoard.tsx';
import {
  completedTournament,
  nextTournamentMatch,
  nextTournamentTurn,
  recordTournamentResult,
  startTournamentTurn,
} from './rules.ts';
import type { Tournament, TournamentRecord } from './rules.ts';
import { LeaveTournamentDialog } from './LeaveTournamentDialog.tsx';

interface ActiveTournamentProps {
  backToGame(): void;
  initial: Tournament;
  onAnnouncement(message: string): void;
  onFinished(record: TournamentRecord): void;
}

export function ActiveTournament({
  initial,
  backToGame,
  onAnnouncement,
  onFinished,
}: ActiveTournamentProps) {
  const [tournament, setTournament] = useState(initial);
  const [session, setSession] = useState(() => {
    const code = initial.matches[0]?.boardCode ?? 'np1-4-1';
    return initialSession(code, { size: parseBoardCode(code)?.size ?? 4, bestMoves: {} });
  });
  const [confirmLeave, setConfirmLeave] = useState(false);
  const current = useRef(session);
  const startButton = useRef<HTMLButtonElement>(null);
  const nextTurnButton = useRef<HTMLButtonElement>(null);
  const nextMatchButton = useRef<HTMLButtonElement>(null);
  const championHeading = useRef<HTMLHeadingElement>(null);

  function commit(next: typeof session): void {
    if (next === current.current) return;
    current.current = next;
    setSession(next);
  }

  const clock = useSessionClock(session, current, commit);
  const match = tournament.matches[tournament.currentMatch];
  const playerSeed = match?.players[tournament.currentTurn] ?? null;
  const player = tournament.players.find((item) => item.seed === playerSeed);
  const winner = tournament.players.find((item) => item.seed === match?.winnerSeed);

  useEffect(() => {
    if (tournament.phase === 'ready') startButton.current?.focus();
    if (tournament.phase === 'next-turn') nextTurnButton.current?.focus();
    if (tournament.phase === 'next-match') nextMatchButton.current?.focus();
    if (tournament.phase === 'complete') championHeading.current?.focus();
  }, [tournament.currentMatch, tournament.currentTurn, tournament.phase]);

  if (!match) return <p>The tournament could not be opened.</p>;

  function resetTurn(code: string): void {
    clock.reset();
    commit(replaceGame(current.current, createGame(code), false));
  }

  function startTurn(): void {
    setTournament(startTournamentTurn(tournament));
    if (player) onAnnouncement(`Now playing: ${player.name}`);
  }

  function activate(index: number): void {
    if (tournament.phase !== 'playing') return;
    clock.synchronize();
    const nextGame = activateCard(current.current.game, index);
    if (nextGame === current.current.game) return;
    commit({ ...current.current, game: nextGame });
    if (!isWon(nextGame)) return;
    const nextTournament = recordTournamentResult(tournament, {
      elapsedMs: nextGame.elapsedMs,
      moves: nextGame.moves,
    });
    setTournament(nextTournament);
    const finishedPlayer = player;
    if (nextTournament.phase === 'complete') {
      const record = completedTournament(nextTournament);
      if (record) {
        const champion = nextTournament.players.find((item) => item.seed === record.championSeed);
        onAnnouncement(`Champion: ${champion?.name ?? 'Unknown player'}`);
        onFinished(record);
      }
    } else if (nextTournament.phase === 'next-match') {
      const winnerSeed = nextTournament.matches[nextTournament.currentMatch]?.winnerSeed;
      const matchWinner = nextTournament.players.find((item) => item.seed === winnerSeed);
      onAnnouncement(`Match winner: ${matchWinner?.name ?? 'Unknown player'}`);
    } else {
      onAnnouncement(
        `${finishedPlayer?.name ?? 'Player'} finished in ${nextGame.moves} moves and ${formatElapsed(nextGame.elapsedMs)}.`,
      );
    }
  }

  function nextTurn(): void {
    const next = nextTournamentTurn(tournament);
    setTournament(next);
    resetTurn(match.boardCode);
    const nextSeed = match.players[1];
    const name = tournament.players.find((item) => item.seed === nextSeed)?.name;
    if (name) onAnnouncement(`Now playing: ${name}`);
  }

  function nextMatch(): void {
    const next = nextTournamentMatch(tournament);
    setTournament(next);
    const nextMatch = next.matches[next.currentMatch];
    if (nextMatch) resetTurn(nextMatch.boardCode);
    const nextSeed = nextMatch?.players[0];
    const name = tournament.players.find((item) => item.seed === nextSeed)?.name;
    if (name) onAnnouncement(`Now playing: ${name}`);
  }

  const currentPlayerName = player?.name ?? 'Player';
  const winnerName = winner?.name ?? 'Match winner';
  const showBoard = tournament.phase === 'playing' || tournament.phase === 'complete';
  return (
    <section className="tournament-active" aria-labelledby="tournament-round">
      {tournament.phase === 'complete' ? (
        <h3 id="tournament-round" ref={championHeading} tabIndex={-1}>
          Champion: {tournament.players.find((item) => item.seed === tournament.championSeed)?.name}
        </h3>
      ) : (
        <h3 id="tournament-round">Round: {match.round}</h3>
      )}
      {tournament.phase === 'ready' || tournament.phase === 'playing' ? (
        <p className="tournament-now-playing">Now playing: {currentPlayerName}</p>
      ) : tournament.phase === 'next-turn' ? (
        <p className="tournament-now-playing">
          {currentPlayerName} finished: {session.game.moves} moves ·{' '}
          {formatElapsed(session.game.elapsedMs)}
        </p>
      ) : tournament.phase === 'next-match' ? (
        <p className="tournament-now-playing">Match winner: {winnerName}</p>
      ) : null}
      <p className="tournament-intro">
        Both players use this deal. Fewer moves wins; tied moves go to the faster time, then the
        higher seed.
      </p>
      {tournament.phase === 'ready' && (
        <button ref={startButton} className="control" type="button" onClick={startTurn}>
          Start turn
        </button>
      )}
      {tournament.phase === 'next-turn' && (
        <button ref={nextTurnButton} className="control" type="button" onClick={nextTurn}>
          Next turn
        </button>
      )}
      {tournament.phase === 'next-match' && (
        <button ref={nextMatchButton} className="control" type="button" onClick={nextMatch}>
          Next match
        </button>
      )}
      {tournament.phase === 'complete' && (
        <button className="control" type="button" onClick={backToGame}>
          Back to game
        </button>
      )}
      {tournament.phase !== 'complete' && (
        <button className="control" type="button" onClick={() => setConfirmLeave(true)}>
          Leave tournament
        </button>
      )}
      {showBoard && (
        <ActiveTournamentBoard
          game={session.game}
          generation={session.generation}
          playing={tournament.phase === 'playing'}
          activate={activate}
        />
      )}
      <BracketTable matches={tournament.matches} players={tournament.players} />
      <LeaveTournamentDialog
        open={confirmLeave}
        close={() => setConfirmLeave(false)}
        leave={backToGame}
      />
    </section>
  );
}
