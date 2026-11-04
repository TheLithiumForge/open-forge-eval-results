import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { JSX, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { describeFace } from "./face.ts";
import { FaceArtwork } from "./FaceArtwork.tsx";
import type { GameState } from "../state.ts";
import "./board.css";

export type BoardHandle = Readonly<{ focusRemembered(): void }>;
export type BoardProps = Readonly<{
  game: GameState;
  paused: boolean;
  dealId: number;
  onActivate(index: number): void;
}>;

type FocusMemory = Readonly<{ dealId: number; index: number }>;
type ScrollPosition = Readonly<{ left: number; top: number }>;
const FOCUS_MARGIN = 6;
const FOCUS_OUTLINE_EXTENT = 5;

export const Board = forwardRef<BoardHandle, BoardProps>(function Board(
  { game, paused, dealId, onActivate }, forwardedRef,
): JSX.Element {
  const size = game.board.size;
  const gridMinimum = size * 44 + (size - 1) * 6;
  const gridMaximum = size * 88 + (size - 1) * 6;
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollRef = useRef<ScrollPosition>({ left: 0, top: 0 });
  const suppressClickRef = useRef(false);
  const [memory, setMemory] = useState<FocusMemory>({ dealId, index: 0 });
  const focusIndex = memory.dealId === dealId ? memory.index : 0;

  function focusCard(index: number): void {
    const card = cardRefs.current[index];
    if (!card) return;
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: "nearest", inline: "nearest" });
    rememberScrollPosition();
  }

  function rememberScrollPosition(): void {
    const scroller = scrollerRef.current;
    if (scroller) lastScrollRef.current = { left: scroller.scrollLeft, top: scroller.scrollTop };
  }

  useImperativeHandle(forwardedRef, () => ({
    focusRemembered() {
      focusCard(focusIndex);
    },
  }), [focusIndex]);

  function rememberFocus(index: number, target: HTMLButtonElement): void {
    setMemory({ dealId, index });
    const scroller = scrollerRef.current;
    if (scroller) {
      const prior = lastScrollRef.current;
      if (scroller.scrollLeft !== prior.left || scroller.scrollTop !== prior.top) {
        scroller.scrollTo({ left: prior.left, top: prior.top });
      }
    }
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (!scroller) return;
    const viewport = scroller.getBoundingClientRect();
    const card = target.getBoundingClientRect();
    const left = viewport.left + scroller.clientLeft + FOCUS_MARGIN;
    const right = viewport.left + scroller.clientLeft + scroller.clientWidth - FOCUS_MARGIN;
    const top = viewport.top + scroller.clientTop + FOCUS_MARGIN;
    const bottom = viewport.top + scroller.clientTop + scroller.clientHeight - FOCUS_MARGIN;
    if (card.left - FOCUS_OUTLINE_EXTENT < left) {
      scroller.scrollLeft += card.left - FOCUS_OUTLINE_EXTENT - left;
    } else if (card.right + FOCUS_OUTLINE_EXTENT > right) {
      scroller.scrollLeft += card.right + FOCUS_OUTLINE_EXTENT - right;
    }
    if (card.top - FOCUS_OUTLINE_EXTENT < top) {
      scroller.scrollTop += card.top - FOCUS_OUTLINE_EXTENT - top;
    } else if (card.bottom + FOCUS_OUTLINE_EXTENT > bottom) {
      scroller.scrollTop += card.bottom + FOCUS_OUTLINE_EXTENT - bottom;
    }
    rememberScrollPosition();
  }

  function moveFocus(index: number, key: string): void {
    const row = Math.floor(index / size);
    const column = index % size;
    let destination = index;
    if (key === "ArrowLeft" && column > 0) destination -= 1;
    if (key === "ArrowRight" && column < size - 1) destination += 1;
    if (key === "ArrowUp" && row > 0) destination -= size;
    if (key === "ArrowDown" && row < size - 1) destination += size;
    if (destination !== index) focusCard(destination);
  }

  function onCardKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "Enter" || event.key === " ") suppressClickRef.current = false;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight"
      || event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(index, event.key);
    }
  }

  function onCardClick(event: MouseEvent<HTMLButtonElement>, index: number): void {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (paused) return;
    onActivate(index);
  }

  function clearSuppressionOnPress(event: PointerEvent<HTMLButtonElement>): void {
    if (event.button === 0) suppressClickRef.current = false;
  }

  return (
    <div className="neon-board-scroll" role="group" aria-label={`${size} by ${size} card board`} ref={scrollerRef}
      onScroll={rememberScrollPosition}>
      <div className="neon-board-grid" style={{
        gridTemplateColumns: `repeat(${size}, minmax(44px, 88px))`,
        minWidth: `${gridMinimum}px`,
        maxWidth: `${gridMaximum}px`,
        marginInline: "auto",
      }}>
        {game.board.deck.map((faceId, index) => {
          const matched = game.matched.includes(index);
          const selected = game.selection.kind === "one" && game.selection.index === index;
          const mismatch = game.selection.kind === "mismatch"
            && (game.selection.first === index || game.selection.second === index);
          const visible = matched || selected || mismatch;
          const row = Math.floor(index / size) + 1;
          const column = index % size + 1;
          const label = visible
            ? `Row ${row}, column ${column}, ${describeFace(faceId).name}, ${matched ? "matched" : "revealed"}`
            : `Row ${row}, column ${column}, closed`;
          return (
            <button
              className={`neon-board-card${visible && !matched ? " neon-board-card--revealed" : ""}`}
              type="button"
              key={index}
              ref={(element) => { cardRefs.current[index] = element; }}
              tabIndex={focusIndex === index ? 0 : -1}
              aria-label={label}
              aria-disabled={matched || undefined}
              onFocus={(event) => rememberFocus(index, event.currentTarget)}
              onKeyDown={(event) => onCardKeyDown(event, index)}
              onClick={(event) => onCardClick(event, index)}
              onPointerDown={clearSuppressionOnPress}
              onPointerCancel={() => { suppressClickRef.current = true; }}
              onContextMenu={() => { suppressClickRef.current = true; }}
            >
              {visible
                ? <FaceArtwork faceId={faceId} />
                : <BackArtwork />}
              {matched ? <span className="neon-board-check" aria-hidden="true">✓</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
});

function BackArtwork(): JSX.Element {
  return (
    <svg className="neon-board-back" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="m50 22 28 28-28 28-28-28Z" fill="none" stroke="#757C9A" strokeWidth="4" />
    </svg>
  );
}
