import { useEffect, useState } from 'react'

interface ReproductionControlsProps {
  boardCode: string
  revision: number
  paused: boolean
  status: string
  onLoadBoard(code: string): void
  onExport(): string
  onLoadSnapshot(text: string): void
  onResume(): void
}

export function ReproductionControls({ boardCode, revision, paused, status, onLoadBoard, onExport, onLoadSnapshot, onResume }: ReproductionControlsProps) {
  const [codeDraft, setCodeDraft] = useState(boardCode)
  const [snapshotDraft, setSnapshotDraft] = useState('')
  useEffect(() => { setCodeDraft(boardCode) }, [boardCode, revision])

  return (
    <details className="reproduction">
      <summary>Reproduce a game</summary>
      <div className="reproduction-content">
        <div className="reproduction-row">
          <label htmlFor="board-code">Board code</label>
          <input id="board-code" type="text" maxLength={32} value={codeDraft} onChange={(event) => setCodeDraft(event.currentTarget.value)} />
          <button type="button" className="action-button" onClick={() => onLoadBoard(codeDraft)}>Load board</button>
        </div>
        <div className="reproduction-row snapshot-row">
          <label htmlFor="snapshot-json">Snapshot JSON</label>
          <textarea id="snapshot-json" maxLength={65_536} value={snapshotDraft} onChange={(event) => setSnapshotDraft(event.currentTarget.value)} />
          <div className="snapshot-actions">
            <button type="button" className="action-button" onClick={() => setSnapshotDraft(onExport())}>Export snapshot</button>
            <button type="button" className="action-button" onClick={() => onLoadSnapshot(snapshotDraft)}>Load snapshot</button>
          </div>
        </div>
        {paused && <button type="button" className="action-button resume-button" onClick={onResume}>Resume</button>}
        {status && <p className="reproduction-status" aria-hidden="true">{status}</p>}
      </div>
    </details>
  )
}
