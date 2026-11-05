import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { parseBoardCode } from '../deck.ts';
import { isWon } from '../game.ts';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { encodeSnapshot, decodeSnapshot } from '../snapshot.ts';
import { initialSession, activateSession } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import type { Session } from '../session/session.ts';
import type { TournamentPlayer, TournamentResult } from './tournament.ts';

export interface TournamentTurnHandle {
  exportSnapshot(): string;
}

interface TournamentTurnProps {
  readonly autoFocusBoard: boolean;
  readonly boardCode: string;
  readonly initialSnapshot: string | null;
  readonly onBoardFocused: () => void;
  readonly onComplete: (result: TournamentResult) => void;
  readonly onFeedback: (feedback: string, announcement: number) => void;
  readonly player: TournamentPlayer;
}

export const TournamentTurn = forwardRef<TournamentTurnHandle, TournamentTurnProps>(
  function TournamentTurn(
    { autoFocusBoard, boardCode, initialSnapshot, onBoardFocused, onComplete, onFeedback, player },
    ref,
  ) {
    const [session, setSession] = useState(() => createTurnSession(boardCode, initialSnapshot));
    const current = useRef(session);
    const board = useRef<BoardFocus>(null);
    const onCompleteRef = useRef(onComplete);
    const onFeedbackRef = useRef(onFeedback);
    const onBoardFocusedRef = useRef(onBoardFocused);
    onCompleteRef.current = onComplete;
    onFeedbackRef.current = onFeedback;
    onBoardFocusedRef.current = onBoardFocused;

    function commit(next: Session): void {
      if (next === current.current) return;
      current.current = next;
      setSession(next);
    }

    const clock = useSessionClock(session, current, commit);
    const synchronizeRef = useRef(clock.synchronize);
    synchronizeRef.current = clock.synchronize;

    useImperativeHandle(
      ref,
      () => ({
        exportSnapshot() {
          synchronizeRef.current();
          return encodeSnapshot(current.current.game);
        },
      }),
      [],
    );

    useLayoutEffect(() => {
      if (!autoFocusBoard) return;
      board.current?.focusRemembered();
      onBoardFocusedRef.current();
    }, [autoFocusBoard]);

    useEffect(() => {
      if (session.announcement > 0 && session.feedback)
        onFeedbackRef.current(session.feedback, session.announcement);
    }, [session.announcement, session.feedback]);

    useEffect(() => {
      if (isWon(session.game))
        onCompleteRef.current({ elapsedMs: session.game.elapsedMs, moves: session.game.moves });
    }, [session.game.elapsedMs, session.game.matched.length, session.game.moves]);

    function activate(index: number): void {
      clock.synchronize();
      commit(activateSession(current.current, index));
    }

    return (
      <section className="tournament-turn" aria-labelledby="tournament-turn-title">
        <h3 id="tournament-turn-title">{player.name}'s game</h3>
        <GameStatus game={session.game} best={undefined} celebration={false} showBest={false} />
        <p id="tournament-board-help" className="help">
          Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space reveals a card.
        </p>
        <Board
          key={session.generation}
          game={session.game}
          activate={activate}
          helpId="tournament-board-help"
          ref={board}
        />
      </section>
    );
  },
);

function createTurnSession(boardCode: string, snapshotText: string | null): Session {
  const restored = snapshotText ? decodeSnapshot(snapshotText) : null;
  const size = restored?.size ?? parseBoardCode(boardCode)?.size ?? 4;
  const session = initialSession(boardCode, { size, bestMoves: {} });
  return restored?.boardCode === boardCode ? { ...session, game: restored } : session;
}
