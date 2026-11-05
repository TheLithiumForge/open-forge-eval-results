import { useImperativeHandle, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { useTournamentTurn } from '../session/use-tournament-turn.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { matchRound, turnIndex } from './rules.ts';
import type { Ref } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { Result, TournamentState } from './rules.ts';

export interface TurnExport {
  exportTurn(): string;
}
interface TournamentPlayProps {
  tournament: TournamentState;
  snapshot: string | null;
  publish(text: string): void;
  finish(result: Result): void;
  started(): void;
  ref: Ref<TurnExport>;
}

export function TournamentPlay({
  tournament,
  snapshot,
  publish,
  finish,
  started,
  ref,
}: TournamentPlayProps) {
  const match = tournament.matches[tournament.matchIndex];
  const controller = useTournamentTurn(match?.boardCode ?? '', snapshot, publish, finish);
  const board = useRef<BoardFocus>(null);
  useImperativeHandle(ref, () => ({ exportTurn: controller.exportTurn }));
  if (!match) return null;
  const player = match.players[turnIndex(tournament)];
  const { session } = controller;
  const result = match.results[turnIndex(tournament)];
  return (
    <div className="tournament-play">
      <p>Round: {matchRound(tournament.players.length, tournament.matchIndex).name}</p>
      <p className="now-playing">
        Now playing: {player === undefined ? '' : tournament.players[player]}
      </p>
      {result ? (
        <p className={`victory${session.celebration ? ' celebrate' : ''}`}>
          Every pair found in {result.moves} moves and {formatElapsed(result.elapsedMs)}.
        </p>
      ) : session.paused ? (
        <button
          className="control"
          type="button"
          onClick={() => {
            controller.start();
            started();
          }}
        >
          Start turn
        </button>
      ) : (
        <>
          <GameStatus game={session.game} best={undefined} celebration={session.celebration} />
          <p className="help" id="board-help">
            Arrow keys move between cards. Enter or Space reveals a card.
          </p>
          <Board game={session.game} activate={controller.activate} ref={board} />
        </>
      )}
    </div>
  );
}
