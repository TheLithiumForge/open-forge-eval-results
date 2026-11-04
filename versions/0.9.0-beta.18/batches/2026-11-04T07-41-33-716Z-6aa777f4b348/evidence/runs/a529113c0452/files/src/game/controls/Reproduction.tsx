import { useEffect, useState } from 'react';
import type { GameSession } from '../session/useSession.ts';
import './Reproduction.css';

type ReproductionProps = Readonly<{ session: GameSession; onResume: () => void }>;

export function Reproduction({ session, onResume }: ReproductionProps) {
  const [boardCode, setBoardCode] = useState(session.game.board.code);
  const [snapshot, setSnapshot] = useState('');
  useEffect(() => setBoardCode(session.game.board.code), [session.resetId, session.game.board.code]);

  return (
    <details className="reproduction">
      <summary>Reproduce a game</summary>
      <div className="reproduction-content">
        <p className="help">A board code repeats a deal. A snapshot saves your progress.</p>
        <div className="board-code-controls">
          <label className="code-field">Board code
            <input type="text" maxLength={32} value={boardCode} spellCheck={false} autoComplete="off"
              onChange={(event) => setBoardCode(event.currentTarget.value)} />
          </label>
          <button type="button" onClick={() => session.loadBoard(boardCode)}>Load board</button>
        </div>
        <label className="snapshot-field">Snapshot JSON
          <textarea maxLength={65536} rows={6} value={snapshot} spellCheck={false}
            onChange={(event) => setSnapshot(event.currentTarget.value)} />
        </label>
        <div className="snapshot-actions">
          <button type="button" onClick={() => setSnapshot(session.exportSnapshot())}>Export snapshot</button>
          <button type="button" onClick={() => session.loadSnapshot(snapshot)}>Load snapshot</button>
          {session.paused && <button type="button" onClick={onResume}>Resume</button>}
        </div>
        <p className="load-status">{session.loadStatus}</p>
      </div>
    </details>
  );
}
