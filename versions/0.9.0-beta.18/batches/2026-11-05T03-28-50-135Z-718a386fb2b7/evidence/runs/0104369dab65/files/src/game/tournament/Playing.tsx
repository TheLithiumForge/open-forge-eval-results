import { useRef, useState } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { isWon } from '../game.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { encodeProgress, decodeProgress } from './progress.ts';
import { activateSession, initialSession } from '../session/session.ts';
import type { Session } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import type { Result } from './rules.ts';

export interface PlayHandle {
  snapshot(): string;
}
export function Playing({
  code,
  snapshot,
  finished,
  handle,
  publish,
}: {
  code: string;
  snapshot: string | null;
  finished(result: Result): void;
  publish(text: string): void;
  handle: React.RefObject<PlayHandle | null>;
}) {
  const [session, setSession] = useState(() => {
    const initial = initialSession(code, { size: 4, bestMoves: {} });
    const game = snapshot ? decodeProgress(snapshot) : null;
    return game ? { ...initial, game, paused: true } : initial;
  });
  const current = useRef<Session>(session);
  const board = useRef<BoardFocus>(null);
  function commit(next: Session) {
    current.current = next;
    setSession(next);
  }
  const clock = useSessionClock(session, current, commit);
  handle.current = {
    snapshot: () => {
      clock.synchronize();
      return encodeProgress(current.current.game);
    },
  };
  function activate(index: number) {
    clock.synchronize();
    if (isWon(current.current.game)) return;
    const previous = current.current;
    const next = activateSession(previous, index);
    if (next.announcement !== previous.announcement) publish(next.feedback);
    // This session is isolated and never writes its temporary preferences.
    commit(next);
    if (!isWon(current.current.game)) return;
    finished({ moves: next.game.moves, elapsedMs: next.game.elapsedMs });
  }
  return (
    <>
      <dl className="stats">
        <div>
          <dt>Moves</dt>
          <dd>{session.game.moves}</dd>
        </div>
        <div>
          <dt>Pairs</dt>
          <dd>
            {session.game.matched.length / 2}/{session.game.deck.length / 2}
          </dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatElapsed(session.game.elapsedMs)}</dd>
        </div>
      </dl>
      <p id="board-help" className="help">
        Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
        reveals a card.
      </p>
      {session.paused && (
        <button
          className="control"
          type="button"
          onClick={() => {
            clock.reset();
            commit({ ...current.current, paused: false });
            board.current?.focusRemembered();
          }}
        >
          Resume
        </button>
      )}
      <Board game={session.game} activate={activate} ref={board} />
    </>
  );
}
