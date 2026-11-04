import { BOARD_SIZES, isBoardSize } from '../boardCode.ts';
import type { BoardSize } from '../boardCode.ts';
import './DealControls.css';

type DealControlsProps = Readonly<{
  size: BoardSize;
  changeSize: (size: BoardSize) => void;
  newGame: () => void;
  restart: () => void;
}>;

export function DealControls({ size, changeSize, newGame, restart }: DealControlsProps) {
  return <div className="deal-controls">
    <div className="size-control">
      <label htmlFor="grid-size">Grid size</label>
      <select id="grid-size" value={size} onChange={(event) => {
        const value = Number(event.target.value);
        if (isBoardSize(value)) changeSize(value);
      }}>
        {BOARD_SIZES.map((side) => <option key={side} value={side}>{side}x{side}</option>)}
      </select>
    </div>
    <button type="button" onClick={newGame}>New Game</button>
    <button type="button" onClick={restart}>Restart</button>
  </div>;
}
