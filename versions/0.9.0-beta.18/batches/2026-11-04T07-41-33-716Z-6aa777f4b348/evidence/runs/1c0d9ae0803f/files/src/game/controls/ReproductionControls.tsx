import { useState } from "react";
import type { SessionAnnouncement } from "../session/types.ts";
import "./controls.css";

type ReproductionControlsProps = Readonly<{
  boardCode: string;
  announcement: SessionAnnouncement | null;
  onBoardCodeChange(code: string): void;
  onLoadBoard(): void;
  onLoadSnapshot(text: string): void;
  onExportSnapshot(): string;
}>;

function visibleControlStatus(announcement: SessionAnnouncement | null): string {
  switch (announcement?.text) {
    case "Invalid board code.":
    case "Invalid snapshot.":
    case "Loaded snapshot. Select Resume to continue.":
    case "Loaded completed snapshot.":
      return announcement.text;
    default:
      return "";
  }
}

export function ReproductionControls({
  boardCode, announcement, onBoardCodeChange, onLoadBoard, onLoadSnapshot, onExportSnapshot,
}: ReproductionControlsProps): React.JSX.Element {
  const [snapshotText, setSnapshotText] = useState("");
  const status = visibleControlStatus(announcement);
  const invalidCode = announcement?.text === "Invalid board code.";
  const invalidSnapshot = announcement?.text === "Invalid snapshot.";

  return (
    <details className="neon-reproduction">
      <summary>Reproduce a game</summary>
      <div className="neon-reproduction-content">
        <label className="neon-field" htmlFor="neon-board-code">
          <span>Board code</span>
          <input id="neon-board-code" type="text" value={boardCode} maxLength={32}
            autoComplete="off" autoCapitalize="none" spellCheck={false}
            aria-invalid={invalidCode} aria-describedby={invalidCode ? "neon-control-status" : undefined}
            onChange={(event) => onBoardCodeChange(event.currentTarget.value)} />
        </label>
        <button className="neon-button neon-board-load" type="button" onClick={onLoadBoard}>
          Load board
        </button>
        <label className="neon-field neon-snapshot-field" htmlFor="neon-snapshot-json">
          <span>Snapshot JSON</span>
          <textarea id="neon-snapshot-json" rows={7} maxLength={65_536} value={snapshotText}
            aria-invalid={invalidSnapshot} aria-describedby={invalidSnapshot ? "neon-control-status" : undefined}
            onChange={(event) => setSnapshotText(event.currentTarget.value)} />
        </label>
        <div className="neon-snapshot-actions">
          <button className="neon-button" type="button" onClick={() => setSnapshotText(onExportSnapshot())}>
            Export snapshot
          </button>
          <button className="neon-button" type="button" onClick={() => onLoadSnapshot(snapshotText)}>
            Load snapshot
          </button>
        </div>
        <p className="neon-control-status" id="neon-control-status">{status}</p>
      </div>
    </details>
  );
}
