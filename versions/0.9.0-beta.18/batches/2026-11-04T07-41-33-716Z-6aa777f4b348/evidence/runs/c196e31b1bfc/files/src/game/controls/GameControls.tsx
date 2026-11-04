import type { RefObject } from "react";
import { BOARD_SIZES, isBoardSize, type BoardSize } from "../boardCode.ts";
import type { BoardHandle } from "../board/Board.tsx";
import type { GameState } from "../state.ts";
import "./controls.css";

interface GameControlsProps {
  readonly game: GameState;
  readonly paused: boolean;
  readonly boardRef: RefObject<BoardHandle | null>;
  readonly onChooseSize: (size: BoardSize) => void;
  readonly onNewGame: () => void;
  readonly onRestart: () => void;
  readonly onResume: () => void;
}

export function GameControls({ game, paused, boardRef, onChooseSize, onNewGame, onRestart, onResume }: GameControlsProps) {
  function changeSize(value: string): void {
    const size = Number(value);
    if (isBoardSize(size)) onChooseSize(size);
  }

  return (
    <section className="deal-controls" aria-label="Game controls">
      <label className="size-control">
        <span>Grid size</span>
        <select value={game.size} onChange={(event) => changeSize(event.currentTarget.value)}>
          {BOARD_SIZES.map((size) => <option key={size} value={size}>{size}x{size}</option>)}
        </select>
      </label>
      <div className="deal-buttons">
        <button className="button button-primary" type="button" onClick={onNewGame}>New Game</button>
        <button className="button" type="button" onClick={onRestart}>Restart</button>
        {paused ? (
          <button className="button button-resume" type="button" onClick={() => {
            boardRef.current?.focusRememberedCard();
            onResume();
          }}>Resume</button>
        ) : null}
      </div>
    </section>
  );
}
