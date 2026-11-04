import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { GameState } from "../state.js";
import { Card } from "./Card.js";
import "./board.css";

const CARD_MIN_SIZE = 44;
const CARD_MAX_SIZE = 88;
const CARD_GAP = 6;
const BOARD_PADDING = 6;

export interface BoardFocusApi {
  focusRemembered(): void;
}

interface BoardProps {
  readonly game: GameState;
  readonly dealRevision: number;
  readonly onActivate: (index: number) => void;
  readonly onFocusApi: (api: BoardFocusApi | null) => void;
}

export function Board({ game, dealRevision, onActivate, onFocusApi }: BoardProps) {
  const scrollArea = useRef<HTMLDivElement>(null);
  const cards = useRef<Array<HTMLButtonElement | null>>([]);
  const rememberedIndex = useRef(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const [cardSize, setCardSize] = useState(CARD_MIN_SIZE);

  const focusRemembered = useCallback(() => {
    cards.current[rememberedIndex.current]?.focus();
  }, []);

  useEffect(() => {
    onFocusApi({ focusRemembered });
    return () => onFocusApi(null);
  }, [focusRemembered, onFocusApi]);

  useEffect(() => {
    rememberedIndex.current = 0;
    setFocusIndex(0);
  }, [dealRevision]);

  useEffect(() => {
    const element = scrollArea.current;
    if (element === null) return;
    const resize = (): void => {
      const room =
        element.clientWidth - BOARD_PADDING * 2 - (game.board.size - 1) * CARD_GAP;
      const nextSize = Math.max(CARD_MIN_SIZE, Math.min(CARD_MAX_SIZE, room / game.board.size));
      setCardSize((current) => (current === nextSize ? current : nextSize));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [game.board.size]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const current = cards.current.findIndex((button) => button === event.target);
    if (current < 0) return;
    const columns = game.board.size;
    let target = current;
    switch (event.key) {
      case "ArrowLeft":
        if (current % columns > 0) target -= 1;
        break;
      case "ArrowRight":
        if (current % columns < columns - 1) target += 1;
        break;
      case "ArrowUp":
        if (current >= columns) target -= columns;
        break;
      case "ArrowDown":
        if (current < game.board.deck.length - columns) target += columns;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (target !== current) cards.current[target]?.focus();
  };

  const style: CSSProperties & { "--columns": number; "--card-size": string } = {
    "--columns": game.board.size,
    "--card-size": `${cardSize}px`,
  };

  return (
    <section className="board-section">
      <p className="board-help" id="board-help">
        Use the arrow keys to move through the cards. Enter or Space reveals a card.
      </p>
      <div className="board-scroll" ref={scrollArea} onKeyDown={onKeyDown}>
        <div
          className="board-grid"
          style={style}
          role="group"
          aria-label="Game board"
          aria-describedby="board-help"
        >
          {game.board.deck.map((_, index) => (
            <Card
              key={index}
              game={game}
              index={index}
              tabStop={focusIndex === index}
              buttonRef={(button) => { cards.current[index] = button; }}
              onActivate={onActivate}
              onFocus={(focusedIndex, button) => {
                rememberedIndex.current = focusedIndex;
                setFocusIndex(focusedIndex);
                button.scrollIntoView({ block: "nearest", inline: "nearest" });
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
