import { isGridSize, SIZES } from '../deck.ts';
import type { GridSize } from '../deck.ts';
import './Controls.css';

type ControlsProps = { size: GridSize; changeSize: (size: GridSize) => void; newGame: () => void; restart: () => void };

export function Controls(props: ControlsProps) {
  return <div className="deal-controls">
    <label><span className="secondary">Grid size</span><select value={props.size} onChange={event => {
      const size = Number(event.target.value);
      if (isGridSize(size)) props.changeSize(size);
    }}>{SIZES.map(size => <option key={size} value={size}>{size}x{size}</option>)}</select></label>
    <button type="button" className="new-game" onClick={props.newGame}>New Game</button>
    <button type="button" onClick={props.restart}>Restart</button>
  </div>;
}
