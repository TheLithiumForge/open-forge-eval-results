import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { SELECTION_KIND, type GameState } from "../types.ts";
import { CARD_STATE, Card, type CardState } from "./Card.tsx";
import "./board.css";

export type BoardHandle = Readonly<{ focusRemembered: () => void }>;
export type BoardProps = Readonly<{
  game: GameState;
  dealRevision: number;
  paused: boolean;
  onActivate: (index: number) => void;
}>;

function cardState(game: GameState, index: number): CardState {
  if (game.matched.includes(index)) return CARD_STATE.MATCHED;
  switch (game.selection.kind) {
    case SELECTION_KIND.CLOSED: return CARD_STATE.CLOSED;
    case SELECTION_KIND.ONE: return game.selection.index === index ? CARD_STATE.REVEALED : CARD_STATE.CLOSED;
    case SELECTION_KIND.MISMATCH:
      return game.selection.first === index || game.selection.second === index ? CARD_STATE.REVEALED : CARD_STATE.CLOSED;
  }
}

function nextIndex(index: number, size: number, count: number, key: string): number {
  const column = index % size;
  switch (key) {
    case "ArrowLeft": return column > 0 ? index - 1 : index;
    case "ArrowRight": return column + 1 < size ? index + 1 : index;
    case "ArrowUp": return index >= size ? index - size : index;
    case "ArrowDown": return index + size < count ? index + size : index;
    default: return index;
  }
}

function isArrow(key: string): boolean {
  return key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown";
}

export const Board = forwardRef<BoardHandle, BoardProps>(function Board(props, ref) {
  const [focusIndex, setFocusIndex] = useState(0);
  const focusIndexRef = useRef(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollArea = useRef<HTMLDivElement | null>(null);
  const count = props.game.board.deck.length;
  const size = props.game.board.size;

  useEffect(() => {
    focusIndexRef.current = 0;
    setFocusIndex(0);
  }, [props.dealRevision]);

  useImperativeHandle(ref, () => ({
    focusRemembered() {
      buttons.current[focusIndexRef.current]?.focus();
    },
  }), []);

  function rememberFocus(index: number): void {
    focusIndexRef.current = index;
    setFocusIndex((current) => current === index ? current : index);
    const area = scrollArea.current;
    const button = buttons.current[index];
    if (area === null || button === null || button === undefined) return;
    const areaRect = area.getBoundingClientRect();
    const cardRect = button.getBoundingClientRect();
    const viewportLeft = areaRect.left + area.clientLeft + 6;
    const viewportTop = areaRect.top + area.clientTop + 6;
    const viewportRight = areaRect.left + area.clientLeft + area.clientWidth - 6;
    const viewportBottom = areaRect.top + area.clientTop + area.clientHeight - 6;
    if (cardRect.left < viewportLeft) area.scrollLeft -= viewportLeft - cardRect.left;
    else if (cardRect.right > viewportRight) area.scrollLeft += cardRect.right - viewportRight;
    if (cardRect.top < viewportTop) area.scrollTop -= viewportTop - cardRect.top;
    else if (cardRect.bottom > viewportBottom) area.scrollTop += cardRect.bottom - viewportBottom;
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !isArrow(event.key)) return;
    event.preventDefault();
    const destination = nextIndex(index, size, count, event.key);
    rememberFocus(destination);
    buttons.current[destination]?.focus();
  }

  function activate(event: MouseEvent<HTMLButtonElement>, index: number): void {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (props.paused) return;
    props.onActivate(index);
  }

  const available = 44 + 6 * (size - 1);
  const style: CSSProperties = {
    gridTemplateColumns: `repeat(${size}, minmax(44px, min(88px, calc((min(100vw, 1120px) - ${available}px) / ${size}))))`,
  };

  return (
    <div className="board-scroll" role="region" aria-label="Card board" ref={scrollArea}>
      <div className="board-grid" role="group" aria-label="Memory cards" style={style}>
        {props.game.board.deck.map((faceId, index) => {
          const state = cardState(props.game, index);
          return (
            <Card
              key={index}
              index={index}
              size={size}
              faceId={state === CARD_STATE.CLOSED ? null : faceId}
              state={state}
              tabIndex={focusIndex === index ? 0 : -1}
              onClick={(event) => activate(event, index)}
              onKeyDown={(event) => moveFocus(event, index)}
              onFocus={() => rememberFocus(index)}
              ref={(element) => { buttons.current[index] = element; }}
            />
          );
        })}
      </div>
    </div>
  );
});
