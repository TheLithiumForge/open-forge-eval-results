import { SIZES, isSize } from '../deck.ts';
import type { Size } from '../deck.ts';
export function DealControls({ size, change, newGame, restart }: { size: Size; change: (size: Size) => void; newGame: () => void; restart: () => void }) {
  return <div className="deal-controls"><label>Grid size <select value={size} onChange={event => { const value = Number(event.target.value); if (isSize(value) && value !== size) change(value); }}>{SIZES.map(n => <option value={n} key={n}>{n}x{n}</option>)}</select></label><button onClick={newGame}>New Game</button><button onClick={restart}>Restart</button></div>;
}
