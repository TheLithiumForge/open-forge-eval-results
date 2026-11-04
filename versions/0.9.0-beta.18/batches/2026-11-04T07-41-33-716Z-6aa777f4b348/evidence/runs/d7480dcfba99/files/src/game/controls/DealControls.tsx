import { SIZES, isSize } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import './DealControls.css';

type Props = { size: Size; onSize: (size: Size) => void; onNew: () => void; onRestart: () => void };
export function DealControls({ size, onSize, onNew, onRestart }: Props) {
  return <div className="deal-controls">
    <div className="size-control"><label htmlFor="grid-size">Grid size</label>
      <select id="grid-size" value={size} onChange={event => {
        const next = Number(event.target.value);
        if (isSize(next) && next !== size) onSize(next);
      }}>{SIZES.map(value => <option key={value} value={value}>{value}x{value}</option>)}</select>
    </div>
    <button type="button" className="primary" onClick={onNew}>New Game</button>
    <button type="button" onClick={onRestart}>Restart</button>
  </div>;
}
