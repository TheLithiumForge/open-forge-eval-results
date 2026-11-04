import './reproduction-controls.css';

type ReproductionProps = {
  boardCode: string;
  snapshot: string;
  status: string;
  onBoardCode: (value: string) => void;
  onSnapshot: (value: string) => void;
  onLoadBoard: () => void;
  onLoadSnapshot: () => void;
  onExport: () => void;
};

export function ReproductionControls(props: ReproductionProps) {
  return (
    <details className="reproduction">
      <summary>Reproduce a game</summary>
      <div className="reproduction-fields">
        <label htmlFor="board-code">Board code</label>
        <div className="input-action">
          <input id="board-code" value={props.boardCode} maxLength={32} onChange={(event) => props.onBoardCode(event.currentTarget.value)} />
          <button type="button" onClick={props.onLoadBoard}>Load board</button>
        </div>
        <label htmlFor="snapshot-json">Snapshot JSON</label>
        <textarea id="snapshot-json" value={props.snapshot} maxLength={65_536} onChange={(event) => props.onSnapshot(event.currentTarget.value)} />
        <div className="input-action">
          <button type="button" onClick={props.onExport}>Export snapshot</button>
          <button type="button" onClick={props.onLoadSnapshot}>Load snapshot</button>
        </div>
        {props.status && <p className="control-status" aria-hidden="true">{props.status}</p>}
      </div>
    </details>
  );
}
