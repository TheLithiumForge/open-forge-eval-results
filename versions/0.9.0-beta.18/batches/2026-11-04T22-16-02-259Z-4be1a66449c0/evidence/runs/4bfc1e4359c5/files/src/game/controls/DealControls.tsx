import { BOARD_SIZES, isBoardSize, type BoardSize } from "../board-code.ts";
import "./controls.css";

type DealControlsProps = {
  size: BoardSize;
  onChangeSize: (size: BoardSize) => void;
  onNewGame: () => void;
  onRestart: () => void;
};

export function DealControls({ size, onChangeSize, onNewGame, onRestart }: DealControlsProps) {
  return (
    <div className="dealControls">
      <label className="sizeControl">
        <span>Grid size</span>
        <select value={size} onChange={(event) => {
          const selected = Number(event.currentTarget.value);
          if (isBoardSize(selected)) onChangeSize(selected);
        }}>
          {BOARD_SIZES.map((option) => <option key={option} value={option}>{option}x{option}</option>)}
        </select>
      </label>
      <button className="actionButton primaryAction" type="button" onClick={onNewGame}>New Game</button>
      <button className="actionButton" type="button" onClick={onRestart}>Restart</button>
    </div>
  );
}
