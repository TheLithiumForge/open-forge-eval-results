import { faceData } from './face.ts'
import { Face } from './Face.tsx'

interface CardProps {
  index: number
  size: number
  faceId: number
  revealed: boolean
  matched: boolean
  tabIndex: 0 | -1
  onFocus(): void
  onRef(node: HTMLButtonElement | null): void
  onActivate(): void
}

export function Card({ index, size, faceId, revealed, matched, tabIndex, onFocus, onRef, onActivate }: CardProps) {
  const row = Math.floor(index / size) + 1
  const column = index % size + 1
  const state = matched ? 'matched' : revealed ? 'revealed' : 'closed'
  const label = revealed || matched
    ? `Row ${row}, column ${column}, ${faceData(faceId).name}, ${state}`
    : `Row ${row}, column ${column}, closed`

  return (
    <button
      ref={onRef}
      type="button"
      className={`card-button${revealed || matched ? ' is-revealed' : ''}${matched ? ' is-matched' : ''}`}
      aria-label={label}
      aria-pressed={revealed || matched}
      aria-disabled={matched || undefined}
      tabIndex={tabIndex}
      onFocus={(event) => {
        onFocus()
        event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }}
      onClick={onActivate}
    >
      {revealed || matched ? <Face faceId={faceId} /> : <BackFace />}
      {matched && <span className="match-check" aria-hidden="true">✓</span>}
    </button>
  )
}

function BackFace() {
  return (
    <svg aria-hidden="true" focusable="false" className="back-art" viewBox="0 0 100 100">
      <polygon points="50,27 73,50 50,73 27,50" fill="none" stroke="#757C9A" strokeWidth="4" />
    </svg>
  )
}
