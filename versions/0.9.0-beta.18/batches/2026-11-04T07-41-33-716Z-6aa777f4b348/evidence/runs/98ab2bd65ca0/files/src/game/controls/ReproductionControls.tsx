import { useEffect, useState, type FormEvent } from "react";
import "./ReproductionControls.css";

export interface ReproductionControlsProps {
  readonly boardCode: string;
  readonly dealRevision: number;
  readonly status: string;
  readonly onLoadBoard: (code: string) => void;
  readonly onExportSnapshot: () => string;
  readonly onLoadSnapshot: (text: string) => void;
}

export function ReproductionControls({
  boardCode,
  dealRevision,
  status,
  onLoadBoard,
  onExportSnapshot,
  onLoadSnapshot,
}: ReproductionControlsProps) {
  const [boardDraft, setBoardDraft] = useState(boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState("");

  useEffect(() => {
    setBoardDraft(boardCode);
  }, [boardCode, dealRevision]);

  function submitBoard(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onLoadBoard(boardDraft);
  }

  function submitSnapshot(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onLoadSnapshot(snapshotDraft);
  }

  return (
    <details className="reproduction-panel">
      <summary>Reproduce a game</summary>
      <div className="reproduction-content">
        <form className="reproduction-form" onSubmit={submitBoard}>
          <label htmlFor="board-code">Board code</label>
          <div className="reproduction-row">
            <input
              autoComplete="off"
              id="board-code"
              maxLength={32}
              onChange={(event) => setBoardDraft(event.currentTarget.value)}
              spellCheck={false}
              type="text"
              value={boardDraft}
            />
            <button type="submit">Load board</button>
          </div>
        </form>
        <form className="reproduction-form" onSubmit={submitSnapshot}>
          <label htmlFor="snapshot-json">Snapshot JSON</label>
          <textarea
            id="snapshot-json"
            maxLength={65536}
            onChange={(event) => setSnapshotDraft(event.currentTarget.value)}
            rows={7}
            spellCheck={false}
            value={snapshotDraft}
          />
          <div className="snapshot-actions">
            <button onClick={() => setSnapshotDraft(onExportSnapshot())} type="button">Export snapshot</button>
            <button type="submit">Load snapshot</button>
          </div>
        </form>
        <p className="reproduction-status">{status}</p>
      </div>
    </details>
  );
}
