import './Reproduction.css';

interface ReproductionProps {
  boardDraft: string;
  onBoardDraft: (text: string) => void;
  snapshotDraft: string;
  onSnapshotDraft: (text: string) => void;
  onLoadBoard: () => void;
  onLoadSnapshot: () => void;
  onExportSnapshot: () => void;
  status: string;
}

export function Reproduction(props: ReproductionProps) {
  return <details className="reproduction">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p className="secondary">A board code repeats a deal. A snapshot saves your progress.</p>
      <div className="board-code-control">
        <label htmlFor="board-code">Board code</label>
        <div className="input-action">
          <input id="board-code" type="text" maxLength={32} autoCapitalize="off" spellCheck={false}
            value={props.boardDraft} onChange={event => props.onBoardDraft(event.target.value)} />
          <button type="button" onClick={props.onLoadBoard}>Load board</button>
        </div>
      </div>
      <label htmlFor="snapshot-json">Snapshot JSON</label>
      <textarea id="snapshot-json" rows={8} maxLength={65536} spellCheck={false}
        value={props.snapshotDraft} onChange={event => props.onSnapshotDraft(event.target.value)} />
      <div className="snapshot-actions">
        <button type="button" onClick={props.onExportSnapshot}>Export snapshot</button>
        <button type="button" onClick={props.onLoadSnapshot}>Load snapshot</button>
      </div>
      {props.status && <p className="load-status">{props.status}</p>}
    </div>
  </details>;
}
