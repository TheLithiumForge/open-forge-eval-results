import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import './controls.css';

export interface ReproductionControlsProps {
  readonly boardCode: string;
  readonly dealId: number;
  readonly paused: boolean;
  readonly status: string;
  readonly onLoadBoard: (draft: string) => boolean;
  readonly onLoadSnapshot: (draft: string) => boolean;
  readonly onExportSnapshot: () => string;
  readonly onResume: () => void;
}

export function ReproductionControls({
  boardCode,
  dealId,
  paused,
  status,
  onLoadBoard,
  onLoadSnapshot,
  onExportSnapshot,
  onResume,
}: ReproductionControlsProps): JSX.Element {
  const [boardDraft, setBoardDraft] = useState(boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState('');

  useEffect(() => {
    setBoardDraft(boardCode);
  }, [dealId, boardCode]);

  return (
    <details className="reproduction-panel">
      <summary>Reproduce a game</summary>
      <div className="reproduction-content">
        <div className="reproduction-field">
          <label htmlFor="board-code">Board code</label>
          <div className="reproduction-row">
            <input
              id="board-code"
              type="text"
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
              value={boardDraft}
              onChange={(event) => setBoardDraft(event.currentTarget.value)}
            />
            <button type="button" className="action-button" onClick={() => onLoadBoard(boardDraft)}>Load board</button>
          </div>
        </div>
        <div className="reproduction-field">
          <label htmlFor="snapshot-json">Snapshot JSON</label>
          <textarea
            id="snapshot-json"
            maxLength={65_536}
            rows={8}
            spellCheck={false}
            value={snapshotDraft}
            onChange={(event) => setSnapshotDraft(event.currentTarget.value)}
          />
          <div className="reproduction-row snapshot-actions">
            <button type="button" className="action-button" onClick={() => setSnapshotDraft(onExportSnapshot())}>Export snapshot</button>
            <button type="button" className="action-button" onClick={() => onLoadSnapshot(snapshotDraft)}>Load snapshot</button>
            {paused && <button type="button" className="action-button" onClick={onResume}>Resume</button>}
          </div>
        </div>
        {status !== '' && <p className="reproduction-status">{status}</p>}
      </div>
    </details>
  );
}
