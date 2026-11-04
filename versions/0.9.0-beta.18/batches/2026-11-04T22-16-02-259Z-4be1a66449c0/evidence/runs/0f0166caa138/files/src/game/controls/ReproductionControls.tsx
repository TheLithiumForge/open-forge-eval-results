import { useEffect, useState } from "react";
import "./controls.css";

type Props = {
  readonly boardCode: string;
  readonly resetToken: number;
  readonly status: string;
  readonly onLoadBoard: (draft: string) => void;
  readonly onExportSnapshot: () => string;
  readonly onLoadSnapshot: (draft: string) => void;
};

export function ReproductionControls(props: Props) {
  const [boardDraft, setBoardDraft] = useState(props.boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState("");

  useEffect(() => {
    setBoardDraft(props.boardCode);
  }, [props.boardCode, props.resetToken]);

  return (
    <div className="reproduction-area">
      <details className="reproduction">
        <summary>Reproduce a game</summary>
        <div className="reproduction-fields">
          <label htmlFor="board-code">Board code</label>
          <div className="field-action">
            <input
              id="board-code"
              type="text"
              maxLength={32}
              value={boardDraft}
              onChange={(event) => setBoardDraft(event.currentTarget.value)}
              spellCheck={false}
            />
            <button type="button" onClick={() => props.onLoadBoard(boardDraft)}>Load board</button>
          </div>

          <label htmlFor="snapshot-json">Snapshot JSON</label>
          <textarea
            id="snapshot-json"
            maxLength={65_536}
            value={snapshotDraft}
            onChange={(event) => setSnapshotDraft(event.currentTarget.value)}
            spellCheck={false}
          />
          <div className="field-action">
            <button type="button" onClick={() => setSnapshotDraft(props.onExportSnapshot())}>
              Export snapshot
            </button>
            <button type="button" onClick={() => props.onLoadSnapshot(snapshotDraft)}>
              Load snapshot
            </button>
          </div>
        </div>
      </details>
      <p className="load-status">{props.status}</p>
    </div>
  );
}
