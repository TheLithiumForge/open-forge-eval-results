import type { ChangeEvent } from "react";
import type { Notice } from "../session/contracts.ts";
import "./reproductionControls.css";

export type ReproductionControlsProps = Readonly<{
  boardCode: string;
  snapshotText: string;
  paused: boolean;
  notice: Notice;
  onBoardCodeChange: (value: string) => void;
  onSnapshotChange: (value: string) => void;
  onLoadBoard: () => void;
  onExport: () => void;
  onLoadSnapshot: () => void;
  onResume: () => void;
}>;

export function ReproductionControls(props: ReproductionControlsProps) {
  const updateBoardCode = (event: ChangeEvent<HTMLInputElement>) => props.onBoardCodeChange(event.currentTarget.value);
  const updateSnapshot = (event: ChangeEvent<HTMLTextAreaElement>) => props.onSnapshotChange(event.currentTarget.value);
  return (
    <section className="reproduction-area" aria-label="Reproduction controls">
      <details className="reproduction-details">
        <summary>Reproduce a game</summary>
        <div className="reproduction-content">
          <div className="form-row">
            <label htmlFor="board-code">Board code</label>
            <div className="control-row">
              <input id="board-code" type="text" maxLength={32} value={props.boardCode} onChange={updateBoardCode} />
              <button type="button" onClick={props.onLoadBoard}>Load board</button>
            </div>
          </div>
          <div className="form-row">
            <label htmlFor="snapshot-json">Snapshot JSON</label>
            <textarea id="snapshot-json" maxLength={65_536} rows={8} value={props.snapshotText} onChange={updateSnapshot} />
          </div>
          <div className="reproduction-actions">
            <button type="button" onClick={props.onExport}>Export snapshot</button>
            <button type="button" onClick={props.onLoadSnapshot}>Load snapshot</button>
            {props.paused ? <button type="button" className="primary-button" onClick={props.onResume}>Resume</button> : null}
          </div>
        </div>
      </details>
      <p className="control-status" aria-hidden="true">{props.notice.text}</p>
    </section>
  );
}
