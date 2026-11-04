import { isBoardSize, SUPPORTED_SIZES, type BoardSize } from '../board.ts'

interface DealControlsProps {
  size: BoardSize
  onSizeChange(size: BoardSize): void
  onNewGame(): void
  onRestart(): void
}

export function DealControls({ size, onSizeChange, onNewGame, onRestart }: DealControlsProps) {
  const handleSizeChange = (value: string): void => {
    const next = Number(value)
    if (isBoardSize(next)) onSizeChange(next)
  }
  return (
    <div className="deal-controls">
      <label className="size-control">
        Grid size
        <select value={size} onChange={(event) => handleSizeChange(event.currentTarget.value)}>
          {SUPPORTED_SIZES.map((side) => <option key={side} value={side}>{side}x{side}</option>)}
        </select>
      </label>
      <button type="button" className="action-button" onClick={onNewGame}>New Game</button>
      <button type="button" className="action-button" onClick={onRestart}>Restart</button>
    </div>
  )
}
