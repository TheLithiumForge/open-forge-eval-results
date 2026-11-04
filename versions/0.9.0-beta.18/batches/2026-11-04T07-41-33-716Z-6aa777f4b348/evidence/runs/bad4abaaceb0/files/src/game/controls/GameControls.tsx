import type { GridSize } from "../constants.ts";
import type { ReactElement, RefObject } from "react";
import type { GameState } from "../state.ts";
import type { BoardHandle } from "../board/Board.tsx";
import { formatTime } from "../transition.ts";
import "./GameControls.css";

type Props = Readonly<{
  game: GameState;
  sizes: readonly GridSize[];
  best: number | null;
  paused: boolean;
  boardRef: RefObject<BoardHandle | null>;
  onSizeChange: (value: string) => void;
  onNewGame: () => void;
  onRestart: () => void;
  onResume: () => void;
}>;

export function GameControls({ game, sizes, best, paused, boardRef, onSizeChange, onNewGame, onRestart, onResume }: Props): ReactElement {
  return (
    <section className="game-controls" aria-label="Game controls">
      <label className="size-control" htmlFor="grid-size">
        <span>Grid size</span>
        <select id="grid-size" value={game.board.size} onChange={(event) => onSizeChange(event.currentTarget.value)}>
          {sizes.map((size) => <option key={size} value={size}>{size}x{size}</option>)}
        </select>
      </label>
      <div className="deal-actions">
        <button type="button" onClick={onNewGame}>New Game</button>
        <button type="button" onClick={onRestart}>Restart</button>
        {paused && <button type="button" onClick={() => { boardRef.current?.focusRemembered(); onResume(); }}>Resume</button>}
      </div>
      <p className="score-line">
        <span>Moves: {game.moves}</span>
        <span>Pairs: {game.matched.length / 2}/{game.deck.length / 2}</span>
        <span>Time: {formatTime(game.elapsedMs)}</span>
        <span>Best: {best === null ? "none" : best}</span>
      </p>
    </section>
  );
}
