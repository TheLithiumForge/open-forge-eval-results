import { GRID_SIZES } from '../deck.ts';
import { DealControl } from './control-labels.ts';
import './control.css';
import './controls.css';

interface ControlsProps {
  size: number;
  newGame(size?: number): void;
  restart(): void;
  tournament?(): void;
}

export function Controls({ size, newGame, restart, tournament }: ControlsProps) {
  return (
    <div className="controls">
      <div className="size-control">
        <label htmlFor="grid-size">{DealControl.size}</label>
        <select
          id="grid-size"
          className="control"
          value={size}
          onChange={(event) => newGame(Number(event.currentTarget.value))}
        >
          {GRID_SIZES.map((option) => (
            <option key={option} value={option}>
              {option}x{option}
            </option>
          ))}
        </select>
      </div>
      <button type="button" className="control" onClick={() => newGame()}>
        {DealControl.newGame}
      </button>
      {tournament && (
        <button type="button" className="control" onClick={tournament}>
          Tournament
        </button>
      )}
      <button type="button" className="control" onClick={restart}>
        {DealControl.restart}
      </button>
    </div>
  );
}
