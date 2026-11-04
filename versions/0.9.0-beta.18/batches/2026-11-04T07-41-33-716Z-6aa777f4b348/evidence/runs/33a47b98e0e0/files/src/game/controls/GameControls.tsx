import type { JSX } from 'react';
import { BOARD_SIZES } from '../board.ts';
import './controls.css';

export interface GameControlsProps {
  readonly size: number;
  readonly onNewGame: () => void;
  readonly onRestart: () => void;
  readonly onChangeSize: (size: number) => void;
}

export function GameControls({ size, onNewGame, onRestart, onChangeSize }: GameControlsProps): React.JSX.Element {
  return (
    <section className="deal-controls" aria-label="Game controls">
      <label htmlFor="grid-size">Grid size</label>
      <select id="grid-size" value={size} onChange={(event) => onChangeSize(Number(event.currentTarget.value))}>
        {BOARD_SIZES.map((boardSize) => (
          <option key={boardSize} value={boardSize}>{boardSize}x{boardSize}</option>
        ))}
      </select>
      <button type="button" className="action-button action-primary" onClick={onNewGame}>New Game</button>
      <button type="button" className="action-button" onClick={onRestart}>Restart</button>
    </section>
  );
}
