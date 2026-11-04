import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import './controls.css';

type Props = { size: Size; resize: (size: Size) => void; newGame: () => void; restart: () => void };
export function DealControls({ size, resize, newGame, restart }: Props) {
  return <div className="deal-controls">
    <label className="size-label">Grid size<select value={size} onChange={event => {
      const next = Number(event.target.value);
      if (isSize(next)) resize(next);
    }}>{SIZES.map(side => <option key={side} value={side}>{side}x{side}</option>)}</select></label>
    <button type="button" className="primary" onClick={newGame}>New Game</button>
    <button type="button" onClick={restart}>Restart</button>
  </div>;
}
