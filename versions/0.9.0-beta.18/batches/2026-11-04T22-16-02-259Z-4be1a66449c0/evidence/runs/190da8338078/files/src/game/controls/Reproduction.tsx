import './Reproduction.css';

type Props = Readonly<{
  boardDraft: string;
  snapshotDraft: string;
  status: string;
  onBoardDraft: (value: string) => void;
  onSnapshotDraft: (value: string) => void;
  onLoadBoard: () => void;
  onExportSnapshot: () => void;
  onLoadSnapshot: () => void;
}>;

export function Reproduction(props: Props) {
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="repro-content">
      <div className="repro-field">
        <label htmlFor="board-code">Board code</label>
        <div className="repro-entry">
          <input id="board-code" type="text" maxLength={32} value={props.boardDraft} onChange={(event) => props.onBoardDraft(event.currentTarget.value)} />
          <button className="button" type="button" onClick={props.onLoadBoard}>Load board</button>
        </div>
      </div>
      <div className="repro-field">
        <label htmlFor="snapshot-json">Snapshot JSON</label>
        <textarea id="snapshot-json" maxLength={65_536} rows={5} value={props.snapshotDraft} onChange={(event) => props.onSnapshotDraft(event.currentTarget.value)} />
        <div className="repro-actions">
          <button className="button" type="button" onClick={props.onExportSnapshot}>Export snapshot</button>
          <button className="button" type="button" onClick={props.onLoadSnapshot}>Load snapshot</button>
        </div>
      </div>
      {props.status && <p className="control-status">{props.status}</p>}
    </div>
  </details>;
}
