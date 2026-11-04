import { forwardRef, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { GameState } from "../state.ts";
import { Card } from "./Card.tsx";
import "./board.css";

export interface BoardHandle {
  focusRememberedCard(): void;
}

type BoardStyle = CSSProperties & { readonly "--board-size": number };

interface BoardProps {
  readonly game: GameState;
  readonly paused: boolean;
  readonly onActivate: (index: number) => void;
}

export const Board = forwardRef<BoardHandle, BoardProps>(function Board({ game, paused, onActivate }, ref) {
  const [tabStop, setTabStop] = useState(0);
  const remembered = useRef(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const scrollArea = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focusRememberedCard() { buttons.current[remembered.current]?.focus(); },
  }), []);

  function focusCard(index: number): void {
    remembered.current = index;
    setTabStop(index);
    buttons.current[index]?.focus();
    scrollFocusedCard(index);
  }

  function scrollFocusedCard(index: number): void {
    const card = buttons.current[index];
    const area = scrollArea.current;
    if (card === null || card === undefined || area === null) return;
    const cardBox = card.getBoundingClientRect();
    const areaBox = area.getBoundingClientRect();
    let left = area.scrollLeft;
    let top = area.scrollTop;
    if (cardBox.left < areaBox.left + 11) left -= areaBox.left + 11 - cardBox.left;
    else if (cardBox.right > areaBox.right - 11) left += cardBox.right - areaBox.right + 11;
    if (cardBox.top < areaBox.top + 11) top -= areaBox.top + 11 - cardBox.top;
    else if (cardBox.bottom > areaBox.bottom - 11) top += cardBox.bottom - areaBox.bottom + 11;
    if (left !== area.scrollLeft || top !== area.scrollTop) area.scrollTo({ left, top, behavior: "auto" });
  }

  function handleKey(index: number, event: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let next = index;
    if (event.key === "ArrowLeft") next = index % game.size > 0 ? index - 1 : index;
    else if (event.key === "ArrowRight") next = index % game.size < game.size - 1 ? index + 1 : index;
    else if (event.key === "ArrowUp") next = index >= game.size ? index - game.size : index;
    else if (event.key === "ArrowDown") next = index + game.size < game.deck.length ? index + game.size : index;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate(index);
      return;
    } else return;
    event.preventDefault();
    focusCard(next);
  }

  const matched = new Set(game.matched);
  const selected = game.selection.kind === "one"
    ? [game.selection.index]
    : game.selection.kind === "mismatch" ? [game.selection.first, game.selection.second] : [];
  const boardStyle: BoardStyle = { "--board-size": game.size };
  return (
    <div className="board-scroll" ref={scrollArea} role="group" aria-label="Memory board" aria-describedby="board-help">
      <div className="board-grid" style={boardStyle}>
        {game.deck.map((faceId, index) => (
          <Card
            key={index}
            index={index}
            columns={game.size}
            faceId={faceId}
            revealed={selected.includes(index)}
            matched={matched.has(index)}
            tabIndex={tabStop === index ? 0 : -1}
            cardRef={(element) => { buttons.current[index] = element; }}
            onActivate={() => onActivate(index)}
            onFocus={() => { remembered.current = index; setTabStop(index); scrollFocusedCard(index); }}
            onKeyDown={(event) => handleKey(index, event)}
          />
        ))}
      </div>
      {paused ? <p className="board-pause-note">Paused. Use Resume to continue.</p> : null}
    </div>
  );
});
