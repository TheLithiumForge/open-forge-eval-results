import { useState } from 'react';
import { BoardCodeForm } from './BoardCodeForm.tsx';
import { ReproductionControl } from './control-labels.ts';
import { GAME_NAME_MAX_LENGTH } from '../game.ts';
import type { GameState } from '../game.ts';
import './control.css';
import './reproduction.css';

const SNAPSHOT_MAX_CHARACTERS = 65_536;

interface ReproductionProps {
  game: GameState;
  generation: number;
  exportSnapshot(): string;
  loadBoard(code: string): boolean;
  loadSnapshot(text: string): boolean;
  nameGame(name: string): void;
  notice: string;
  paused: boolean;
  resume(): void;
}

export function Reproduction({
  game,
  generation,
  exportSnapshot,
  loadBoard,
  loadSnapshot,
  nameGame,
  notice,
  paused,
  resume,
}: ReproductionProps) {
  const [snapshot, setSnapshot] = useState('');
  return (
    <>
      <details className="reproduction">
        <summary>{ReproductionControl.summary}</summary>
        <div className="reproduction-body">
          <BoardCodeForm code={game.boardCode} generation={generation} loadBoard={loadBoard} />
          <label htmlFor="game-name">{ReproductionControl.name}</label>
          <input
            id="game-name"
            className="control"
            type="text"
            maxLength={GAME_NAME_MAX_LENGTH}
            value={game.name}
            onChange={(event) => nameGame(event.currentTarget.value)}
          />
          <label htmlFor="snapshot-json">{ReproductionControl.snapshot}</label>
          <textarea
            id="snapshot-json"
            className="control"
            rows={5}
            value={snapshot}
            maxLength={SNAPSHOT_MAX_CHARACTERS}
            spellCheck={false}
            onChange={(event) => setSnapshot(event.currentTarget.value)}
          />
          <div className="control-row">
            <button type="button" className="control" onClick={() => setSnapshot(exportSnapshot())}>
              {ReproductionControl.exportSnapshot}
            </button>
            <button
              type="button"
              className="control"
              aria-describedby="load-notice"
              onClick={() => loadSnapshot(snapshot)}
            >
              {ReproductionControl.loadSnapshot}
            </button>
          </div>
        </div>
      </details>
      <div className="load-status">
        <p id="load-notice" className="load-notice">
          {notice}
        </p>
        {paused && (
          <button type="button" className="control" onClick={resume}>
            {ReproductionControl.resume}
          </button>
        )}
      </div>
    </>
  );
}
