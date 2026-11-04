import { BOARD_SIZES, isBoardSize } from '../board.ts';
import type { BoardSize } from '../board.ts';
import './controls.css';

interface DealControlsProps {
  readonly size: BoardSize;
  readonly onSizeChange: (size: BoardSize) => void;
  readonly onNewGame: () => void;
  readonly onRestart: () => void;
}

export function DealControls({ size, onSizeChange, onNewGame, onRestart }: DealControlsProps) {
  function handleSizeChange(value: string): void {
    const next = Number(value);
    if (isBoardSize(next)) onSizeChange(next);
  }

  return (
    <section className="deal-controls" aria-label="Deal controls">
      <label className="field-label size-control">
        <span>Grid size</span>
        <select value={size} onChange={(event) => handleSizeChange(event.currentTarget.value)}>
          {BOARD_SIZES.map((side) => <option key={side} value={side}>{side}x{side}</option>)}
        </select>
      </label>
      <button className="button button-primary" type="button" onClick={onNewGame}>New Game</button>
      <button className="button" type="button" onClick={onRestart}>Restart</button>
    </section>
  );
}
