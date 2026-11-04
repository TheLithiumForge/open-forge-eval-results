import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from "react";
import type { GameState } from "../state.ts";
import { Card } from "./Card.tsx";
import "./board.css";

type BoardProps = {
  state: GameState;
  onActivate: (index: number) => void;
  boardRef: RefObject<HTMLDivElement | null>;
};

export function Board({ state, onActivate, boardRef }: BoardProps) {
  const [tabStop, setTabStop] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const size = state.board.size;
  const gridStyle: CSSProperties & { "--grid-size": number } = { "--grid-size": size };

  const focusCard = useCallback((index: number) => {
    setTabStop(index);
    buttons.current[index]?.focus();
  }, []);

  const moveFocus = useCallback((event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let destination = index;
    if (event.key === "ArrowLeft" && index % size > 0) destination -= 1;
    else if (event.key === "ArrowRight" && index % size < size - 1) destination += 1;
    else if (event.key === "ArrowUp" && index >= size) destination -= size;
    else if (event.key === "ArrowDown" && index + size < size * size) destination += size;
    else return;
    event.preventDefault();
    focusCard(destination);
  }, [focusCard, size]);

  return (
    <div className="boardScroll" ref={boardRef} role="group" aria-label="Game board">
      <div className="boardGrid" style={gridStyle}>
        {state.board.deck.map((_, index) => (
          <Card
            key={index}
            state={state}
            index={index}
            tabStop={tabStop === index}
            onActivate={onActivate}
            onKeyDown={moveFocus}
            onFocus={setTabStop}
            buttonRef={(element) => { buttons.current[index] = element; }}
          />
        ))}
      </div>
    </div>
  );
}
