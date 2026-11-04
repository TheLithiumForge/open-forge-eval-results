import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { SELECTION_KIND, type GameState } from '../model.ts'
import { Card } from './Card.tsx'

interface BoardProps {
  state: GameState
  resetFocus: number
  onActivate(index: number): void
  onExposeFocus(focusBoard: () => void): void
}

export function Board({ state, resetFocus, onActivate, onExposeFocus }: BoardProps) {
  const { size } = state.board
  const scrollArea = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([])
  const focusPosition = useRef(0)
  const refCallbacks = useMemo(() => Array.from({ length: size * size }, (_, index) => (node: HTMLButtonElement | null) => {
    cardRefs.current[index] = node
  }), [size])
  const [focusIndex, setFocusIndex] = useState(0)
  const [areaWidth, setAreaWidth] = useState(0)
  const cardSize = Math.min(88, Math.max(44, (areaWidth - 12 - (size - 1) * 6) / size))
  const columns = `repeat(${size}, var(--card-size))`
  const gridStyle: CSSProperties & { '--card-size': string } = {
    gridTemplateColumns: columns,
    '--card-size': `${cardSize}px`,
  }

  useLayoutEffect(() => {
    const area = scrollArea.current
    if (!area) return
    const resize = new ResizeObserver(() => setAreaWidth(area.clientWidth))
    resize.observe(area)
    setAreaWidth(area.clientWidth)
    return () => resize.disconnect()
  }, [])

  useEffect(() => {
    focusPosition.current = 0
    setFocusIndex(0)
  }, [resetFocus])

  useEffect(() => {
    onExposeFocus(() => cardRefs.current[focusPosition.current]?.focus())
  }, [onExposeFocus])

  const handleFocus = useCallback((index: number): void => {
    focusPosition.current = index
    setFocusIndex(index)
  }, [])

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const current = event.target instanceof HTMLButtonElement ? cardRefs.current.indexOf(event.target) : -1
    if (current < 0) return
    let destination = current
    if (event.key === 'ArrowLeft') destination = current % size > 0 ? current - 1 : current
    else if (event.key === 'ArrowRight') destination = current % size < size - 1 ? current + 1 : current
    else if (event.key === 'ArrowUp') destination = current >= size ? current - size : current
    else if (event.key === 'ArrowDown') destination = current < size * (size - 1) ? current + size : current
    else return
    event.preventDefault()
    if (destination !== current) cardRefs.current[destination]?.focus()
  }

  return (
    <div ref={scrollArea} className="board-scroll" onKeyDown={moveFocus}>
      <div className="board-grid" role="group" aria-label={`${size} by ${size} card board`} style={gridStyle}>
        {state.deck.map((faceId, index) => {
          const matched = state.matched.includes(index)
          const selected = state.selection.kind === SELECTION_KIND.one
            ? state.selection.index === index
            : state.selection.kind === SELECTION_KIND.mismatch && (state.selection.first === index || state.selection.second === index)
          return (
            <Card
              key={index}
              index={index}
              size={size}
              faceId={faceId}
              revealed={selected}
              matched={matched}
              tabIndex={focusIndex === index ? 0 : -1}
              onFocus={() => handleFocus(index)}
              onRef={refCallbacks[index] ?? (() => undefined)}
              onActivate={() => onActivate(index)}
            />
          )
        })}
      </div>
    </div>
  )
}
