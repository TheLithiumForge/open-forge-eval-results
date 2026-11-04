import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import type { SessionActions } from '../session/sessionTypes.ts';
import './DealControls.css';

interface DealControlsProps { readonly size: Size; readonly actions: SessionActions }

export function DealControls({ size, actions }: DealControlsProps) {
  return <div className="deal-controls">
    <div className="size-control">
      <label htmlFor="grid-size">Grid size</label>
      <select id="grid-size" value={size} onChange={event => {
        const next = Number(event.currentTarget.value);
        if (isSize(next)) actions.chooseSize(next);
      }}>{SIZES.map(value => <option key={value} value={value}>{value}x{value}</option>)}</select>
    </div>
    <button type="button" onClick={actions.newGame}>New Game</button>
    <button type="button" onClick={actions.restart}>Restart</button>
  </div>;
}
