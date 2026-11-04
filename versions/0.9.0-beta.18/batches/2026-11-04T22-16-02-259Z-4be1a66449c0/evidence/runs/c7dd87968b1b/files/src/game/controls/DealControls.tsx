import { GRID_SIZES } from '../board/sizes.ts';
import type { GameState } from '../types.ts';
import type { BestScores } from '../session/storage.ts';
import './deal-controls.css';

type DealControlsProps = {
  game: GameState;
  size: number;
  best: BestScores;
  paused: boolean;
  onSize: (value: string) => void;
  onNew: () => void;
  onRestart: () => void;
  onResume: () => void;
};

export function DealControls({ game, size, best, paused, onSize, onNew, onRestart, onResume }: DealControlsProps) {
  return (
    <section className="deal-controls" aria-label="Game controls">
      <label className="size-label" htmlFor="grid-size">Grid size</label>
      <select id="grid-size" value={size} onChange={(event) => onSize(event.currentTarget.value)}>
        {GRID_SIZES.map((option) => <option key={option} value={option}>{option}x{option}</option>)}
      </select>
      <button type="button" onClick={onNew}>New Game</button>
      <button type="button" onClick={onRestart}>Restart</button>
      {paused && <button type="button" onClick={onResume}>Resume</button>}
      <span className="best-score">Best: {best[game.board.size] ?? 'none'}</span>
    </section>
  );
}
