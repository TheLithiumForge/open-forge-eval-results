import { useEffect, useState, type RefObject } from "react";
import { encodeSnapshot } from "../snapshot";
import { isWon, type GameState } from "../game";
import type { BoardHandle } from "../board/Board";

interface ReproductionProps {
  readonly game: GameState;
  readonly dealVersion: number;
  readonly paused: boolean;
  readonly boardRef: RefObject<BoardHandle | null>;
  readonly onLoadBoard: (code: string) => boolean;
  readonly onLoadSnapshot: (text: string) => GameState | null;
  readonly onResume: () => void;
  readonly onStatus: (message: string) => void;
}

export function Reproduction({ game, dealVersion, paused, boardRef, onLoadBoard, onLoadSnapshot, onResume, onStatus }: ReproductionProps) {
  const [boardDraft, setBoardDraft] = useState(game.board.code);
  const [snapshotDraft, setSnapshotDraft] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => { setBoardDraft(game.board.code); }, [dealVersion, game.board.code]);

  const loadBoard = () => {
    if (!onLoadBoard(boardDraft.trim())) {
      const message = "Invalid board code.";
      setStatus(message);
      onStatus(message);
      return;
    }
    const message = "Loaded board.";
    setStatus(message);
    onStatus(message);
  };

  const exportSnapshot = () => {
    const encoded = encodeSnapshot(game);
    setSnapshotDraft(JSON.stringify(JSON.parse(encoded) as unknown, null, 2));
  };

  const loadSnapshot = () => {
    const loaded = onLoadSnapshot(snapshotDraft);
    if (loaded === null) {
      const message = "Invalid snapshot.";
      setStatus(message);
      onStatus(message);
      return;
    }
    const message = isWon(loaded) ? "Loaded completed snapshot." : "Loaded snapshot. Select Resume to continue.";
    setStatus(message);
    onStatus(message);
  };

  const resume = () => {
    boardRef.current?.focusRemembered();
    onResume();
  };

  return (
    <details className="reproduction-panel">
      <summary>Reproduce a game</summary>
      <div className="reproduction-fields">
        <label htmlFor="board-code">Board code</label>
        <div className="field-row">
          <input id="board-code" value={boardDraft} maxLength={32} onChange={(event) => setBoardDraft(event.currentTarget.value)} />
          <button type="button" onClick={loadBoard}>Load board</button>
        </div>
        <label htmlFor="snapshot-json">Snapshot JSON</label>
        <textarea id="snapshot-json" value={snapshotDraft} maxLength={65_536} rows={8} onChange={(event) => setSnapshotDraft(event.currentTarget.value)} />
        <div className="field-row">
          <button type="button" onClick={exportSnapshot}>Export snapshot</button>
          <button type="button" onClick={loadSnapshot}>Load snapshot</button>
          {paused && <button type="button" onClick={resume}>Resume</button>}
        </div>
        <p className="load-status">{status}</p>
      </div>
    </details>
  );
}
