import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Board } from '../board/Board.tsx';
import { encodeTournament } from './format.ts';
import { tournamentRecord } from './records.ts';
import {
  advanceTournamentMatch,
  advanceTournamentTurn,
  finishTournamentTurn,
  startTournamentTurn,
  tickTournament,
} from './transitions.ts';
import { useGameClock } from '../session/use-session-clock.ts';
import { Bracket } from './Bracket.tsx';
import { TournamentStatus } from './TournamentStatus.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import type { TournamentPhase, TournamentRecord, TournamentState } from './model.ts';
import type { RefObject } from 'react';
import './tournament.css';

export interface TournamentPlayHandle {
  exportTournament(): string;
}

interface TournamentPlayProps {
  initial: TournamentState;
  ref: RefObject<TournamentPlayHandle | null>;
  onPhaseChange(phase: TournamentPhase): void;
  onFinished(record: TournamentRecord): void;
  onBack(): void;
}

export function TournamentPlay({
  initial,
  ref,
  onPhaseChange,
  onFinished,
  onBack,
}: TournamentPlayProps) {
  const [tournament, setTournament] = useState(initial);
  const current = useRef(tournament);
  const board = useRef<BoardFocus>(null);
  const action = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const previousPhase = useRef<TournamentPhase | null>(null);

  function commit(next: TournamentState): void {
    const previous = current.current;
    if (next === previous) return;
    current.current = next;
    setTournament(next);
    if (next.phase !== previous.phase) onPhaseChange(next.phase);
    if (previous.phase !== 'finished' && next.phase === 'finished')
      onFinished(tournamentRecord(next));
  }

  const clock = useGameClock(tournament, current, commit, tickTournament);
  useLayoutEffect(() => {
    const previous = previousPhase.current;
    if (previous === null) {
      if (tournament.phase === 'ready') action.current?.focus();
      if (tournament.phase === 'finished') backButton.current?.focus();
    } else if (previous !== tournament.phase) {
      if (previous === 'ready' && tournament.phase === 'playing') board.current?.focusRemembered();
      else if (tournament.phase === 'finished') backButton.current?.focus();
      else if (tournament.phase !== 'playing') action.current?.focus();
    }
    previousPhase.current = tournament.phase;
  }, [tournament.phase]);
  useImperativeHandle(
    ref,
    () => ({
      exportTournament() {
        clock.synchronize();
        return encodeTournament(current.current);
      },
    }),
    [clock.synchronize],
  );

  const round = tournament.rounds[tournament.currentRound];
  const match = round?.matches[tournament.currentMatch];
  if (!round || !match)
    return <p className="tournament-message">Tournament bracket unavailable.</p>;
  const displayTurn = tournament.phase === 'nextTurn' ? 1 : tournament.currentTurn;
  const playerSeed = match.players[displayTurn];
  const player = tournament.players.find((candidate) => candidate.seed === playerSeed);
  const champion = tournament.players.find(
    (candidate) => candidate.seed === tournament.championSeed,
  );
  const showsGame = tournament.phase !== 'ready' && tournament.phase !== 'finished';

  return (
    <div className="tournament-play">
      {tournament.phase !== 'finished' && (
        <>
          <p className="tournament-round-label">Round: {round.name}</p>
          <p
            className="tournament-current-player"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span key={`${tournament.currentRound}-${tournament.currentMatch}-${displayTurn}`}>
              Now playing: {player?.name ?? 'Pending'}
            </span>
          </p>
        </>
      )}
      <Bracket players={tournament.players} rounds={tournament.rounds} />
      {showsGame && (
        <>
          <TournamentStatus game={tournament.game} />
          <p id="tournament-board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <Board
            key={tournament.generation}
            game={tournament.game}
            activate={(index) => {
              clock.synchronize();
              commit(finishTournamentTurn(current.current, index, Date.now()));
            }}
            ref={board}
          />
        </>
      )}
      {tournament.phase === 'ready' && (
        <button
          ref={action}
          type="button"
          className="control tournament-action"
          onClick={() => commit(startTournamentTurn(current.current))}
        >
          Start turn
        </button>
      )}
      {tournament.phase === 'nextTurn' && (
        <button
          ref={action}
          type="button"
          className="control tournament-action"
          onClick={() => commit(advanceTournamentTurn(current.current))}
        >
          Next turn
        </button>
      )}
      {tournament.phase === 'nextMatch' && (
        <button
          ref={action}
          type="button"
          className="control tournament-action"
          onClick={() => commit(advanceTournamentMatch(current.current))}
        >
          Next match
        </button>
      )}
      {tournament.phase === 'finished' && champion && (
        <section className="tournament-champion" aria-live="polite">
          <p>Champion: {champion.name}</p>
          <button ref={backButton} type="button" className="control" onClick={onBack}>
            Back to game
          </button>
        </section>
      )}
    </div>
  );
}
