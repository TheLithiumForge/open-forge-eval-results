import { GRID_SIZES } from '../deck.ts';
import { DealControl } from './control-labels.ts';
import type { RefObject } from 'react';
import './control.css';
import './controls.css';

interface ControlsProps {
  size: number;
  newGame(size?: number): void;
  restart(): void;
  openTournament(): void;
  tournamentButton: RefObject<HTMLButtonElement | null>;
}

export function Controls({
  size,
  newGame,
  restart,
  openTournament,
  tournamentButton,
}: ControlsProps) {
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
      <button ref={tournamentButton} type="button" className="control" onClick={openTournament}>
        {DealControl.tournament}
      </button>
      <button type="button" className="control" onClick={restart}>
        {DealControl.restart}
      </button>
    </div>
  );
}
