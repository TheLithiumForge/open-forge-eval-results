import { BOARD_SIZES, isBoardSize, type BoardSize } from "../board.ts";
import "./controls.css";

type DealControlsProps = Readonly<{
  size: BoardSize;
  resumeVisible: boolean;
  onSizeChange(size: BoardSize): void;
  onNewGame(): void;
  onRestart(): void;
  onResume(): void;
}>;

export function DealControls({
  size, resumeVisible, onSizeChange, onNewGame, onRestart, onResume,
}: DealControlsProps): React.JSX.Element {
  function selectSize(value: string): void {
    const next = Number(value);
    if (isBoardSize(next)) onSizeChange(next);
  }

  return (
    <section className="neon-deal-panel" aria-label="Game controls">
      {resumeVisible ? (
        <button className="neon-button neon-button--primary neon-resume" type="button" onClick={onResume}>
          Resume
        </button>
      ) : null}
      <div className="neon-deal-controls">
        <label className="neon-field neon-size-field" htmlFor="neon-grid-size">
          <span>Grid size</span>
          <select id="neon-grid-size" value={size}
            onChange={(event) => selectSize(event.currentTarget.value)}>
            {BOARD_SIZES.map((option) => (
              <option value={option} key={option}>{option}x{option}</option>
            ))}
          </select>
        </label>
        <button className="neon-button neon-button--primary" type="button" onClick={onNewGame}>
          New Game
        </button>
        <button className="neon-button" type="button" onClick={onRestart}>
          Restart
        </button>
      </div>
    </section>
  );
}
