import { BOARD_SIZES, type BoardSize } from '../model.ts'
import './controls.css'

type Props = Readonly<{
  size: BoardSize
  onSizeChange: (size: number) => void
  onNewGame: () => void
  onRestart: () => void
}>

export function DealControls({ size, onSizeChange, onNewGame, onRestart }: Props) {
  return (
    <section aria-label="Game controls" className="deal-controls">
      <label className="field-label" htmlFor="grid-size">Grid size</label>
      <select id="grid-size" onChange={(event) => onSizeChange(Number(event.currentTarget.value))} value={size}>
        {BOARD_SIZES.map((side) => <option key={side} value={side}>{side}x{side}</option>)}
      </select>
      <button className="primary-button" onClick={onNewGame} type="button">New Game</button>
      <button className="secondary-button" onClick={onRestart} type="button">Restart</button>
    </section>
  )
}
