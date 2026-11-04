import './controls.css'

type Props = Readonly<{
  boardCode: string
  snapshot: string
  status: string
  resumeVisible: boolean
  onBoardCodeChange: (value: string) => void
  onSnapshotChange: (value: string) => void
  onLoadBoard: () => void
  onLoadSnapshot: () => void
  onExport: () => void
  onResume: () => void
}>

export function ReproductionControls(props: Props) {
  return (
    <details className="reproduction-panel">
      <summary>Reproduce a game</summary>
      <div className="reproduction-fields">
        <div className="reproduction-field">
          <label className="field-label" htmlFor="board-code">Board code</label>
          <div className="field-action-row">
            <input
              id="board-code"
              maxLength={32}
              onChange={(event) => props.onBoardCodeChange(event.currentTarget.value)}
              type="text"
              value={props.boardCode}
            />
            <button className="secondary-button" onClick={props.onLoadBoard} type="button">Load board</button>
          </div>
        </div>
        <div className="reproduction-field">
          <label className="field-label" htmlFor="snapshot-json">Snapshot JSON</label>
          <textarea
            id="snapshot-json"
            maxLength={65536}
            onChange={(event) => props.onSnapshotChange(event.currentTarget.value)}
            rows={5}
            value={props.snapshot}
          />
          <div className="field-action-row field-action-row--wrap">
            <button className="secondary-button" onClick={props.onExport} type="button">Export snapshot</button>
            <button className="secondary-button" onClick={props.onLoadSnapshot} type="button">Load snapshot</button>
            {props.resumeVisible ? <button className="primary-button" onClick={props.onResume} type="button">Resume</button> : null}
          </div>
        </div>
        {props.status ? <p aria-hidden="true" className="reproduction-status">{props.status}</p> : null}
      </div>
    </details>
  )
}
