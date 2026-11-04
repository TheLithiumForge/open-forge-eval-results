import { boardSizes, isBoardSize } from '../boardCode.ts';
import type { BoardSize } from '../boardCode.ts';
import './controls.css';

export interface DealControlsProps {
  readonly size: BoardSize;
  readonly onSizeChange: (size: BoardSize) => void;
  readonly onNewGame: () => void;
  readonly onRestart: () => void;
}

export function DealControls({ size, onSizeChange, onNewGame, onRestart }: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-control">Grid size
      <select value={size} onChange={event => {
        const selected = Number(event.currentTarget.value);
        if (isBoardSize(selected)) onSizeChange(selected);
      }}>
        {boardSizes.map(option => <option key={option} value={option}>{option}x{option}</option>)}
      </select>
    </label>
    <button className="new-game" type="button" onClick={onNewGame}>New Game</button>
    <button type="button" onClick={onRestart}>Restart</button>
  </div>;
}
