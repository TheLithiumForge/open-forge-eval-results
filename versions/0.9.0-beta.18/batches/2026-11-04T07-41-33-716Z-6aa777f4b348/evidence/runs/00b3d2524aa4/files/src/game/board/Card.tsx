import type { CSSProperties, KeyboardEvent, Ref } from 'react'
import FaceSvg from './FaceSvg.tsx'
import { describeFace } from './face.ts'
import './board.css'

type Props = Readonly<{
  index: number
  side: number
  faceId: number
  revealed: boolean
  matched: boolean
  tabStop: boolean
  buttonRef: Ref<HTMLButtonElement>
  onFocus: () => void
  onClick: () => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
  onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => void
  cardSize: number
}>

export function Card({ index, side, faceId, revealed, matched, tabStop, buttonRef, onFocus, onClick, onKeyDown, onKeyUp, cardSize }: Props) {
  const shown = revealed || matched
  const row = Math.floor(index / side) + 1
  const column = (index % side) + 1
  const state = matched ? 'matched' : 'revealed'
  const face = shown ? describeFace(faceId) : null
  const checkPosition = face === null ? 'bottom-right' : getCheckPosition(face.marker)
  const label = shown && face !== null
    ? `Row ${row}, column ${column}, ${face.name}, ${state}`
    : `Row ${row}, column ${column}, closed`
  const style: CSSProperties = { width: cardSize, height: cardSize }

  return (
    <button
      aria-label={label}
      aria-disabled={matched}
      className={`card${shown ? ' card--face' : ''}${matched ? ' card--matched' : ''}`}
      onClick={onClick}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      ref={buttonRef}
      style={style}
      tabIndex={tabStop ? 0 : -1}
      type="button"
    >
      {shown ? <FaceSvg faceId={faceId} /> : <span aria-hidden="true" className="card-back-mark" />}
      {matched ? <span aria-hidden="true" className={`card-check card-check--${checkPosition}`}>✓</span> : null}
    </button>
  )
}

function getCheckPosition(marker: string): string {
  if (marker === 'top') return 'bottom'
  if (marker === 'top-right') return 'bottom-left'
  if (marker === 'right') return 'left'
  if (marker === 'bottom-right') return 'top-left'
  if (marker === 'bottom') return 'top'
  if (marker === 'bottom-left') return 'top-right'
  if (marker === 'left') return 'right'
  return 'bottom-right'
}
