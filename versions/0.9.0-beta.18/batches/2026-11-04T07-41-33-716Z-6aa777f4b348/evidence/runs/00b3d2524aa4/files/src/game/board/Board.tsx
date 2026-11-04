import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { KeyboardEvent, Ref } from 'react'
import type { GameState } from '../model.ts'
import { Card } from './Card.tsx'
import './board.css'

export type BoardHandle = Readonly<{ focusRememberedCard: () => void }>
type Props = Readonly<{ game: GameState; onActivate: (index: number) => void }>

export const Board = forwardRef<BoardHandle, Props>(function Board({ game, onActivate }, ref) {
  const side = game.board.size
  const [remembered, setRemembered] = useState(0)
  const rememberedRef = useRef(0)
  const [cardSize, setCardSize] = useState(44)
  const scrollRef = useRef<HTMLDivElement>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const suppressedKey = useRef<string | null>(null)

  useImperativeHandle(ref, () => ({
    focusRememberedCard: () => buttons.current[rememberedRef.current]?.focus(),
  }), [])

  useEffect(() => {
    const scrollArea = scrollRef.current
    if (scrollArea === null) return
    const resize = () => {
      const available = scrollArea.clientWidth - 12 - 6 * (side - 1)
      const nextSize = Math.max(44, Math.min(88, available / side))
      setCardSize(nextSize)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(scrollArea)
    resize()
    return () => observer.disconnect()
  }, [side])

  function focusIndex(index: number): void {
    rememberedRef.current = index
    setRemembered(index)
    buttons.current[index]?.focus()
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const movement = !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
    if (!movement) return
    const row = Math.floor(index / side)
    const column = index % side
    let target = index
    if (event.key === 'ArrowLeft') target = column === 0 ? index : index - 1
    else if (event.key === 'ArrowRight') target = column === side - 1 ? index : index + 1
    else if (event.key === 'ArrowUp') target = row === 0 ? index : index - side
    else if (event.key === 'ArrowDown') target = row === side - 1 ? index : index + side
    else return
    event.preventDefault()
    if (target !== index) focusIndex(target)
  }

  function markSuppressedKey(event: KeyboardEvent<HTMLButtonElement>): void {
    if ((event.key === 'Enter' || event.key === ' ') && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) {
      suppressedKey.current = event.key
    }
  }

  function clearSuppressedKey(event: KeyboardEvent<HTMLButtonElement>): void {
    if (suppressedKey.current !== event.key) return
    window.setTimeout(() => { suppressedKey.current = null }, 0)
  }

  function activate(index: number): void {
    if (suppressedKey.current !== null) return
    onActivate(index)
  }

  return (
    <div aria-label="Game board" className="board-scroll" ref={scrollRef} role="group">
      <div className="board-grid" style={{ gridTemplateColumns: `repeat(${side}, ${cardSize}px)` }}>
        {game.board.deck.map((faceId, index) => {
          const matched = game.matched.includes(index)
          let revealed = false
          if (game.selection.kind === 'one') revealed = game.selection.index === index
          else if (game.selection.kind === 'mismatch') revealed = game.selection.first === index || game.selection.second === index
          const buttonRef: Ref<HTMLButtonElement> = (element) => { buttons.current[index] = element }
          return (
            <Card
              buttonRef={buttonRef}
              cardSize={cardSize}
              faceId={faceId}
              index={index}
              key={index}
              matched={matched}
              onClick={() => activate(index)}
              onFocus={() => focusFocusedCard(index)}
              onKeyDown={(event) => { markSuppressedKey(event); moveFocus(event, index) }}
              onKeyUp={clearSuppressedKey}
              side={side}
              tabStop={remembered === index}
              revealed={revealed}
            />
          )
        })}
      </div>
    </div>
  )

  function focusFocusedCard(index: number): void {
    rememberedRef.current = index
    setRemembered(index)
    buttons.current[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
})
