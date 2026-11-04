import "./controls.css";
import { BOARD_CODE_INPUT_LIMIT, SNAPSHOT_LIMIT_BYTES } from "../constants.js";

interface ReproductionControlsProps {
  readonly boardCode: string;
  readonly snapshot: string;
  readonly status: string;
  readonly paused: boolean;
  readonly onBoardCodeChange: (code: string) => void;
  readonly onSnapshotChange: (snapshot: string) => void;
  readonly onLoadBoard: () => void;
  readonly onLoadSnapshot: () => void;
  readonly onExportSnapshot: () => void;
  readonly onResume: () => void;
}

export function ReproductionControls(props: ReproductionControlsProps) {
  return (
    <details className="reproduction-panel">
      <summary>Reproduce a game</summary>
      <div className="reproduction-content">
        <div className="reproduction-field">
          <label htmlFor="board-code">Board code</label>
          <div className="field-row">
            <input
              id="board-code"
              type="text"
              maxLength={BOARD_CODE_INPUT_LIMIT}
              value={props.boardCode}
              onChange={(event) => props.onBoardCodeChange(event.currentTarget.value)}
            />
            <button type="button" onClick={props.onLoadBoard}>Load board</button>
          </div>
        </div>
        <div className="reproduction-field">
          <label htmlFor="snapshot-json">Snapshot JSON</label>
          <textarea
            id="snapshot-json"
            maxLength={SNAPSHOT_LIMIT_BYTES}
            value={props.snapshot}
            onChange={(event) => props.onSnapshotChange(event.currentTarget.value)}
            rows={8}
          />
          <div className="field-row">
            <button type="button" onClick={props.onExportSnapshot}>Export snapshot</button>
            <button type="button" onClick={props.onLoadSnapshot}>Load snapshot</button>
            {props.paused && <button type="button" onClick={props.onResume}>Resume</button>}
          </div>
        </div>
        <p className="reproduction-status">{props.status}</p>
      </div>
    </details>
  );
}
