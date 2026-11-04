import { SUPPORTED_SIZES, isBoardSize } from '../types.ts';
import type { BoardSize } from '../types.ts';
import './DealControls.css';

type Props = Readonly<{
  size: BoardSize;
  onSizeChange: (size: BoardSize) => void;
  onNewGame: () => void;
  onRestart: () => void;
}>;

export function DealControls({ size, onSizeChange, onNewGame, onRestart }: Props) {
  return <section className="deal-controls" aria-label="Game controls">
    <label className="size-control">
      <span>Grid size</span>
      <select value={size} onChange={(event) => {
        const value = Number(event.currentTarget.value);
        if (isBoardSize(value)) onSizeChange(value);
      }}>
        {SUPPORTED_SIZES.map((side) => <option key={side} value={side}>{side}x{side}</option>)}
      </select>
    </label>
    <div className="deal-buttons">
      <button className="button button-primary" type="button" onClick={onNewGame}>New Game</button>
      <button className="button" type="button" onClick={onRestart}>Restart</button>
    </div>
  </section>;
}
