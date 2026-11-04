import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { GameSession } from '../session/use-game-session.ts';
import './BoardCodeControl.css';

interface BoardCodeControlProps {
  readonly session: GameSession;
}

export function BoardCodeControl({ session }: BoardCodeControlProps) {
  const [draft, setDraft] = useState(session.game.board.boardCode);

  useEffect(() => {
    setDraft(session.game.board.boardCode);
  }, [session.dealRevision, session.game.board.boardCode]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    session.loadBoard(draft);
  }

  return (
    <form className="board-code-form" onSubmit={submit}>
      <label htmlFor="board-code">Board code</label>
      <div className="control-row">
        <input
          id="board-code"
          type="text"
          maxLength={32}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit">Load board</button>
      </div>
    </form>
  );
}
