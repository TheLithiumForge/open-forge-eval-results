import { useState } from 'react';
import { BoardCodeControl } from './BoardCodeControl.tsx';
import './ReproductionControls.css';

export interface ReproductionControlsProps {
  boardCode: string;
  dealId: number;
  paused: boolean;
  status: string;
  onLoadBoard: (draft: string) => boolean;
  onExport: () => string;
  onLoadSnapshot: (draft: string) => boolean;
  onResume: () => void;
}

export function ReproductionControls({ boardCode, dealId, paused, status,
  onLoadBoard, onExport, onLoadSnapshot, onResume }: ReproductionControlsProps) {
  const [snapshot, setSnapshot] = useState('');
  return <details className="reproduction-controls">
    <summary>Reproduce a game</summary>
    <div className="reproduction-content">
      <p>Repeat a deal with its board code, or save your progress in a snapshot.</p>
      <BoardCodeControl boardCode={boardCode} dealId={dealId} onLoad={onLoadBoard} />
      <div className="snapshot-control">
        <label htmlFor="snapshot-json">Snapshot JSON</label>
        <textarea id="snapshot-json" value={snapshot} maxLength={65536} rows={7}
          spellCheck={false} aria-describedby="snapshot-help"
          onChange={(event) => setSnapshot(event.currentTarget.value)} />
        <p id="snapshot-help">Export, then select and copy the JSON to keep it. Load a snapshot to restore it.</p>
      </div>
      <div className="snapshot-actions">
        <button type="button" onClick={() => setSnapshot(onExport())}>Export snapshot</button>
        <button type="button" onClick={() => onLoadSnapshot(snapshot)}>Load snapshot</button>
        {paused && <button type="button" onClick={onResume}>Resume</button>}
      </div>
      {status && <p className="reproduction-status">{status}</p>}
    </div>
  </details>;
}
