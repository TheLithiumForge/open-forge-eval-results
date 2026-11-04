import { useEffect, useState } from "react";
import type { GameState } from "../state.ts";
import "./controls.css";

interface ReproductionControlsProps {
  readonly game: GameState;
  readonly revision: number;
  readonly loadBoard: (code: string) => boolean;
  readonly loadSnapshot: (text: string) => boolean;
  readonly exportSnapshot: () => string;
}

export function ReproductionControls({ game, revision, loadBoard, loadSnapshot, exportSnapshot }: ReproductionControlsProps) {
  const [boardDraft, setBoardDraft] = useState(game.boardCode);
  const [snapshotDraft, setSnapshotDraft] = useState("");
  useEffect(() => {
    setBoardDraft(game.boardCode);
    setSnapshotDraft("");
  }, [game.boardCode, revision]);
  return (
    <details className="reproduction-panel">
      <summary>Reproduce a game</summary>
      <div className="reproduction-body">
        <form className="reproduction-form" onSubmit={(event) => { event.preventDefault(); loadBoard(boardDraft); }}>
          <label htmlFor="board-code">Board code</label>
          <div className="reproduction-row">
            <input id="board-code" type="text" maxLength={32} value={boardDraft} onChange={(event) => setBoardDraft(event.currentTarget.value)} />
            <button className="button" type="submit">Load board</button>
          </div>
        </form>
        <div className="reproduction-form">
          <label htmlFor="snapshot-json">Snapshot JSON</label>
          <textarea id="snapshot-json" maxLength={65536} rows={5} value={snapshotDraft} onChange={(event) => setSnapshotDraft(event.currentTarget.value)} />
          <div className="reproduction-row">
            <button className="button" type="button" onClick={() => setSnapshotDraft(exportSnapshot())}>Export snapshot</button>
            <button className="button" type="button" onClick={() => loadSnapshot(snapshotDraft)}>Load snapshot</button>
          </div>
        </div>
      </div>
    </details>
  );
}
