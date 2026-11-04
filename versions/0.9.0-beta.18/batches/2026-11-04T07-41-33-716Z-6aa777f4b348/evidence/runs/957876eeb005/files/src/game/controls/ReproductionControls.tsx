import { useEffect, useState } from 'react';
import type { GameSession } from '../session/use-game-session.ts';
import './ReproductionControls.css';

export interface ReproductionControlsProps {
  readonly session: GameSession;
  readonly onResume: () => void;
}

export function ReproductionControls({ session, onResume }: ReproductionControlsProps) {
  const [boardDraft, setBoardDraft] = useState(session.game.board.code);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  useEffect(() => { setBoardDraft(session.game.board.code); }, [session.dealId, session.game.board.code]);
  return (
    <details className="reproduction">
      <summary>Reproduce a game</summary>
      <div className="reproduction-content">
        <p className="help">Repeat a deal with its board code, or save your progress as a snapshot.</p>
        <div className="board-code-controls">
          <label className="draft-control">Board code
            <input type="text" value={boardDraft} maxLength={32} spellCheck={false}
              onChange={event => setBoardDraft(event.currentTarget.value)} />
          </label>
          <button type="button" onClick={() => { session.loadBoard(boardDraft); }}>Load board</button>
        </div>
        <label className="draft-control">Snapshot JSON
          <textarea value={snapshotDraft} maxLength={65536} rows={6} spellCheck={false}
            onChange={event => setSnapshotDraft(event.currentTarget.value)} />
        </label>
        <div className="snapshot-actions">
          <button type="button" onClick={() => setSnapshotDraft(session.exportSnapshot())}>Export snapshot</button>
          <button type="button" onClick={() => { session.loadSnapshot(snapshotDraft); }}>Load snapshot</button>
          {session.paused && <button type="button" className="resume-game" onClick={onResume}>Resume</button>}
        </div>
        {session.loadStatus !== '' && <p className="load-status">{session.loadStatus}</p>}
      </div>
    </details>
  );
}
