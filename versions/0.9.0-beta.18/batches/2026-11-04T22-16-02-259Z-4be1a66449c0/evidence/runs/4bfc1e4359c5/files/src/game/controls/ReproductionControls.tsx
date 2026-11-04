import type { Announcement, GameSession } from "../session/useGameSession.ts";
import "./controls.css";

type ReproductionControlsProps = Pick<GameSession,
  "status" | "announcement" | "boardCodeDraft" | "setBoardCodeDraft" | "snapshotDraft" |
  "setSnapshotDraft" | "loadBoard" | "exportSnapshot" | "loadSnapshot" | "paused"> & {
  onResume: () => void;
};

export function ReproductionControls(props: ReproductionControlsProps) {
  return (
    <>
      <details className="reproductionPanel">
        <summary>Reproduce a game</summary>
        <div className="reproductionContent">
          <div className="reproductionField">
            <label htmlFor="board-code">Board code</label>
            <div className="fieldActionRow">
              <input
                id="board-code"
                type="text"
                maxLength={32}
                spellCheck={false}
                value={props.boardCodeDraft}
                onChange={(event) => props.setBoardCodeDraft(event.currentTarget.value)}
              />
              <button className="actionButton" type="button" onClick={props.loadBoard}>Load board</button>
            </div>
          </div>
          <div className="reproductionField">
            <label htmlFor="snapshot-json">Snapshot JSON</label>
            <textarea
              id="snapshot-json"
              maxLength={65_536}
              spellCheck={false}
              rows={5}
              value={props.snapshotDraft}
              onChange={(event) => props.setSnapshotDraft(event.currentTarget.value)}
            />
            <div className="fieldActions">
              <button className="actionButton" type="button" onClick={props.exportSnapshot}>Export snapshot</button>
              <button className="actionButton" type="button" onClick={props.loadSnapshot}>Load snapshot</button>
              {props.paused && <button className="actionButton primaryAction" type="button" onClick={props.onResume}>Resume</button>}
            </div>
          </div>
          <p className="reproductionStatus" aria-hidden="true">{props.status}</p>
        </div>
      </details>
      <p key={props.announcement.id} className="screenReaderOnly" role="status" aria-live="polite" aria-atomic="true">
        {props.announcement.text}
      </p>
    </>
  );
}
