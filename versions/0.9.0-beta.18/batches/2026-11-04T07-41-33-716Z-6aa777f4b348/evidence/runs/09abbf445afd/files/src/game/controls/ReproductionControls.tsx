import { useEffect, useState, type FormEvent } from 'react';
import type { GameSession } from '../session/sessionTypes.ts';
import './ReproductionControls.css';

export function ReproductionControls({ session, onResume }: Readonly<{
  session: GameSession;
  onResume: () => void;
}>): React.JSX.Element {
  const { state, revision } = session;
  const [boardDraft, setBoardDraft] = useState(state.board.code);
  const [snapshotDraft, setSnapshotDraft] = useState('');

  useEffect(() => {
    setBoardDraft(state.board.code);
  }, [revision, state.board.code]);

  const submitBoard = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    session.loadBoard(boardDraft);
  };

  const submitSnapshot = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    session.loadSnapshot(snapshotDraft);
  };

  return (
    <details className="reproduction-panel">
      <summary>Reproduce a game</summary>
      <div className="reproduction-body">
        <form className="reproduction-form" onSubmit={submitBoard}>
          <label htmlFor="board-code">Board code</label>
          <div className="input-row">
            <input
              id="board-code"
              type="text"
              maxLength={32}
              value={boardDraft}
              onChange={(event) => setBoardDraft(event.currentTarget.value)}
            />
            <button type="submit" className="game-action">Load board</button>
          </div>
        </form>

        <form className="reproduction-form" onSubmit={submitSnapshot}>
          <label htmlFor="snapshot-json">Snapshot JSON</label>
          <textarea
            id="snapshot-json"
            maxLength={65536}
            value={snapshotDraft}
            onChange={(event) => setSnapshotDraft(event.currentTarget.value)}
            spellCheck={false}
          />
          <div className="snapshot-actions">
            <button type="button" className="game-action game-action--quiet" onClick={() => setSnapshotDraft(session.exportSnapshot())}>Export snapshot</button>
            <button type="submit" className="game-action">Load snapshot</button>
            {session.paused && <button type="button" className="game-action" onClick={onResume}>Resume</button>}
          </div>
        </form>
        <p className="control-status">{session.loadStatus}</p>
      </div>
    </details>
  );
}
