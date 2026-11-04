import { useEffect, useState, type ChangeEvent } from "react";
import { isSideLength, SIDE_LENGTHS, type GameState, type SideLength } from "../model.ts";
import { decodeSnapshot, encodeSnapshot } from "../snapshot.ts";
import { isWon } from "../turns.ts";
import "./Controls.css";

type DealControlsProps = Readonly<{
  side: SideLength;
  onChooseSize: (side: SideLength) => void;
  onNewGame: () => void;
  onRestart: () => void;
}>;

export function DealControls({ side, onChooseSize, onNewGame, onRestart }: DealControlsProps) {
  const changeSize = (event: ChangeEvent<HTMLSelectElement>) => {
    const size = Number(event.currentTarget.value);
    if (isSideLength(size)) onChooseSize(size);
  };
  return (
    <div className="deal-controls">
      <label className="size-field">
        <span>Grid size</span>
        <select aria-label="Grid size" value={side} onChange={changeSize}>
          {SIDE_LENGTHS.map((size) => <option value={size} key={size}>{size}x{size}</option>)}
        </select>
      </label>
      <button className="control-button primary" type="button" onClick={onNewGame}>New Game</button>
      <button className="control-button" type="button" onClick={onRestart}>Restart</button>
    </div>
  );
}

type ReproductionProps = Readonly<{
  game: GameState;
  revision: number;
  paused: boolean;
  onLoadBoard: (code: string) => boolean;
  onLoadSnapshot: (game: GameState) => void;
  onResume: () => void;
  onStatus: (message: string) => void;
}>;

export function ReproductionControls({ game, revision, paused, onLoadBoard, onLoadSnapshot, onResume, onStatus }: ReproductionProps) {
  const [boardDraft, setBoardDraft] = useState(game.board.code);
  const [snapshotDraft, setSnapshotDraft] = useState("");
  useEffect(() => setBoardDraft(game.board.code), [game.board.code, revision]);

  const loadBoard = () => {
    onStatus(onLoadBoard(boardDraft) ? "Loaded board." : "Invalid board code.");
  };
  const exportSnapshot = () => {
    setSnapshotDraft(encodeSnapshot(game));
    onStatus("Snapshot exported.");
  };
  const loadSavedGame = () => {
    const snapshot = decodeSnapshot(snapshotDraft);
    if (!snapshot) {
      onStatus("Invalid snapshot.");
      return;
    }
    onLoadSnapshot(snapshot);
    onStatus(isWon(snapshot) ? "Loaded completed snapshot." : "Loaded snapshot. Select Resume to continue.");
  };

  return (
    <section className="reproduction-area" aria-label="Game reproduction tools">
      <details className="reproduction-panel">
        <summary>Reproduce a game</summary>
        <div className="reproduction-content">
          <div className="reproduction-field">
            <label htmlFor="board-code">Board code</label>
            <div className="input-action-row">
              <input id="board-code" type="text" maxLength={32} value={boardDraft} onChange={(event) => setBoardDraft(event.currentTarget.value)} />
              <button className="control-button" type="button" onClick={loadBoard}>Load board</button>
            </div>
          </div>
          <div className="reproduction-field">
            <label htmlFor="snapshot-json">Snapshot JSON</label>
            <textarea id="snapshot-json" maxLength={65_536} rows={7} value={snapshotDraft} onChange={(event) => setSnapshotDraft(event.currentTarget.value)} />
            <div className="snapshot-actions">
              <button className="control-button" type="button" onClick={exportSnapshot}>Export snapshot</button>
              <button className="control-button" type="button" onClick={loadSavedGame}>Load snapshot</button>
              {paused && <button className="control-button primary" type="button" onClick={onResume}>Resume</button>}
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}
