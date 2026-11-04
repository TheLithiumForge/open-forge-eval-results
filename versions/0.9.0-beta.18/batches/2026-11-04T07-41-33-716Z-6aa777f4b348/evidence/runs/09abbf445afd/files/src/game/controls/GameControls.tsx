import type { ChangeEvent } from 'react';
import { BOARD_SIZES, type BoardSize } from '../constants.ts';
import './GameControls.css';

export function GameControls({ size, onSizeChange, onNewGame, onRestart }: Readonly<{
  size: BoardSize;
  onSizeChange: (size: number) => void;
  onNewGame: () => void;
  onRestart: () => void;
}>): React.JSX.Element {
  const changeSize = (event: ChangeEvent<HTMLSelectElement>): void => {
    const value = Number(event.currentTarget.value);
    onSizeChange(value);
  };

  return (
    <div className="deal-controls">
      <label className="size-control">
        <span>Grid size</span>
        <select value={size} onChange={changeSize}>
          {BOARD_SIZES.map((side) => <option value={side} key={side}>{side}x{side}</option>)}
        </select>
      </label>
      <button type="button" className="game-action" onClick={onNewGame}>New Game</button>
      <button type="button" className="game-action game-action--quiet" onClick={onRestart}>Restart</button>
    </div>
  );
}
