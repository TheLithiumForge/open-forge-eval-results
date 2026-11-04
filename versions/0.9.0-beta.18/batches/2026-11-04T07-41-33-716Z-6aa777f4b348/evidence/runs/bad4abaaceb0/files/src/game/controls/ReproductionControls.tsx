import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import type { GameState } from "../state.ts";
import "./ReproductionControls.css";

type Props = Readonly<{
  game: GameState;
  generation: number;
  status: string | null;
  onLoadBoard: (draft: string) => void;
  onExport: () => string;
  onLoadSnapshot: (draft: string) => void;
}>;

export function ReproductionControls({ game, generation, status, onLoadBoard, onExport, onLoadSnapshot }: Props): ReactElement {
  const [boardDraft, setBoardDraft] = useState(game.board.code);
  const [snapshotDraft, setSnapshotDraft] = useState("");

  useEffect(() => setBoardDraft(game.board.code), [game.board.code, generation]);

  return (
    <details className="reproduction-controls">
      <summary>Reproduce a game</summary>
      <div className="reproduction-content">
        <div className="reproduction-field">
          <label htmlFor="board-code">Board code</label>
          <div className="input-action-row">
            <input id="board-code" type="text" maxLength={32} value={boardDraft} onChange={(event) => setBoardDraft(event.currentTarget.value)} />
            <button type="button" onClick={() => onLoadBoard(boardDraft)}>Load board</button>
          </div>
        </div>
        <div className="reproduction-field">
          <label htmlFor="snapshot-json">Snapshot JSON</label>
          <textarea id="snapshot-json" maxLength={65536} rows={5} value={snapshotDraft} onChange={(event) => setSnapshotDraft(event.currentTarget.value)} />
          <div className="snapshot-actions">
            <button type="button" onClick={() => setSnapshotDraft(onExport())}>Export snapshot</button>
            <button type="button" onClick={() => onLoadSnapshot(snapshotDraft)}>Load snapshot</button>
          </div>
        </div>
        {status && <p className="control-status" aria-hidden="true">{status}</p>}
      </div>
    </details>
  );
}
