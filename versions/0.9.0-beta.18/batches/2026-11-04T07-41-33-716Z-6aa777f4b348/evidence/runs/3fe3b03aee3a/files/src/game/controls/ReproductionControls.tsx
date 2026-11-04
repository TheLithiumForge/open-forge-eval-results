import "./reproduction.css";

export type ReproductionProps = Readonly<{
  boardCode: string;
  snapshotText: string;
  loadStatus: string;
  onBoardCodeChange(value: string): void;
  onSnapshotTextChange(value: string): void;
  onLoadBoard(): void;
  onLoadSnapshot(): void;
  onExportSnapshot(): void;
}>;

export function ReproductionControls(props: ReproductionProps) {
  return (
    <details className="reproduction-panel">
      <summary>Reproduce a game</summary>
      <div className="reproduction-fields">
        <form onSubmit={(event) => { event.preventDefault(); props.onLoadBoard(); }}>
          <label htmlFor="board-code">Board code</label>
          <div className="control-row">
            <input
              id="board-code"
              type="text"
              maxLength={32}
              value={props.boardCode}
              onChange={(event) => props.onBoardCodeChange(event.currentTarget.value)}
              aria-invalid={props.loadStatus === "Invalid board code."}
            />
            <button type="submit">Load board</button>
          </div>
        </form>

        <div className="snapshot-tools">
          <label htmlFor="snapshot-json">Snapshot JSON</label>
          <textarea
            id="snapshot-json"
            maxLength={65536}
            rows={7}
            value={props.snapshotText}
            onChange={(event) => props.onSnapshotTextChange(event.currentTarget.value)}
            aria-invalid={props.loadStatus === "Invalid snapshot."}
          />
          <div className="control-row snapshot-actions">
            <button type="button" onClick={props.onExportSnapshot}>Export snapshot</button>
            <button type="button" onClick={props.onLoadSnapshot}>Load snapshot</button>
          </div>
        </div>

        <p className="reproduction-status" aria-live="off">{props.loadStatus}</p>
      </div>
    </details>
  );
}
