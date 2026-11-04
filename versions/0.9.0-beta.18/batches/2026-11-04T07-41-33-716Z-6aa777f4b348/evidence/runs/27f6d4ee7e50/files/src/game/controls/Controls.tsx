import { useEffect, useState } from "react";
import { BOARD_SIZES, isBoardSize } from "../boardCode.ts";
import type { GameSession } from "../session/useSession.ts";
import "./controls.css";

export interface ControlsProps {
  readonly session: GameSession;
  readonly onResume: () => void;
}

export function Controls({ session, onResume }: ControlsProps) {
  const [boardDraft, setBoardDraft] = useState(session.game.board.code);
  const [snapshotDraft, setSnapshotDraft] = useState("");

  useEffect(() => {
    setBoardDraft(session.game.board.code);
  }, [session.revision, session.game.board.code]);

  return (
    <section className="game-controls" aria-label="Game controls">
      <div className="deal-controls">
        <label className="size-control">
          <span>Grid size</span>
          <select
            value={session.game.board.size}
            onChange={(event) => {
              const size = Number(event.currentTarget.value);
              if (isBoardSize(size)) session.changeSize(size);
            }}
          >
            {BOARD_SIZES.map((size) => <option key={size} value={size}>{size}x{size}</option>)}
          </select>
        </label>
        <button type="button" onClick={session.startNewGame}>New Game</button>
        <button type="button" onClick={session.restart}>Restart</button>
      </div>

      <details className="reproduction-tools">
        <summary>Reproduce a game</summary>
        <div className="reproduction-content">
          <div className="reproduction-field">
            <label htmlFor="board-code">Board code</label>
            <div className="field-action">
              <input
                id="board-code"
                type="text"
                maxLength={32}
                value={boardDraft}
                onChange={(event) => setBoardDraft(event.currentTarget.value)}
              />
              <button type="button" onClick={() => session.loadBoard(boardDraft)}>Load board</button>
            </div>
          </div>
          <div className="reproduction-field">
            <label htmlFor="snapshot-json">Snapshot JSON</label>
            <textarea
              id="snapshot-json"
              maxLength={65_536}
              spellCheck={false}
              value={snapshotDraft}
              onChange={(event) => setSnapshotDraft(event.currentTarget.value)}
            />
            <div className="field-action">
              <button type="button" onClick={() => setSnapshotDraft(session.exportSnapshot())}>Export snapshot</button>
              <button type="button" onClick={() => session.loadSnapshot(snapshotDraft)}>Load snapshot</button>
            </div>
          </div>
          {session.paused && <button type="button" onClick={onResume}>Resume</button>}
          <p className="control-status">{session.status ?? ""}</p>
        </div>
      </details>
    </section>
  );
}
