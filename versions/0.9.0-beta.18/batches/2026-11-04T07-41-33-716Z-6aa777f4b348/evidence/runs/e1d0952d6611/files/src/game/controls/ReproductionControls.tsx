import { useEffect, useState, type FormEvent } from 'react';
import type { SnapshotLoad } from '../session/useGameSession.ts';
import './ReproductionControls.css';

type Props = Readonly<{
  boardCode: string;
  resetKey: number;
  paused: boolean;
  status: string;
  onLoadBoard: (code: string) => boolean;
  onLoadSnapshot: (text: string) => SnapshotLoad;
  onExportSnapshot: () => string;
}>;

export function ReproductionControls({ boardCode, resetKey, paused, status, onLoadBoard,
  onLoadSnapshot, onExportSnapshot }: Props) {
  const [boardDraft, setBoardDraft] = useState(boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  useEffect(() => { setBoardDraft(boardCode); }, [boardCode, resetKey]);

  function submitBoard(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onLoadBoard(boardDraft);
  }

  function submitSnapshot(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onLoadSnapshot(snapshotDraft);
  }

  return (
    <section className="reproduction-controls">
      <details className="reproduce-panel">
        <summary>Reproduce a game</summary>
        <div className="reproduce-content">
          <form className="board-code-form" onSubmit={submitBoard}>
            <label htmlFor="board-code">Board code</label>
            <div className="inline-form-controls">
              <input id="board-code" type="text" maxLength={32} value={boardDraft}
                onChange={(event) => setBoardDraft(event.target.value)} />
              <button type="submit">Load board</button>
            </div>
            <p className="board-code-current">Current board code: <code>{boardCode}</code></p>
          </form>
          <form className="snapshot-form" onSubmit={submitSnapshot}>
            <label htmlFor="snapshot-json">Snapshot JSON</label>
            <textarea id="snapshot-json" maxLength={65_536} rows={8} spellCheck={false}
              value={snapshotDraft} onChange={(event) => setSnapshotDraft(event.target.value)} />
            <div className="inline-form-controls snapshot-actions">
              <button type="button" onClick={() => setSnapshotDraft(onExportSnapshot())}>Export snapshot</button>
              <button type="submit">Load snapshot</button>
            </div>
          </form>
          <p className="reproduction-status" aria-hidden="true">{status}</p>
          {paused ? <p className="resume-help">Imported play is paused until Resume.</p> : null}
        </div>
      </details>
    </section>
  );
}
