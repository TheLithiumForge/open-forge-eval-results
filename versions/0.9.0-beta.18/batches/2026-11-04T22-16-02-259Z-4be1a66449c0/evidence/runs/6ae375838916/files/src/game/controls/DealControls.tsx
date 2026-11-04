import { SIZES, isSize } from '../deck.ts';
import type { Size } from '../deck.ts';
type Props = { size: Size; change: (size: Size) => void; newGame: () => void; restart: () => void };
export function DealControls({ size, change, newGame, restart }: Props) {
  return <div className="deal-controls">
    <label>Grid size <select value={size} onChange={event => { const value = Number(event.target.value); if (isSize(value) && value !== size) change(value); }}>
      {SIZES.map(n => <option key={n} value={n}>{n}x{n}</option>)}
    </select></label>
    <button type="button" onClick={newGame}>New Game</button>
    <button type="button" onClick={restart}>Restart</button>
  </div>;
}
