import { useState } from 'react';
import { DEAL_NAME_MAX_LENGTH } from '../snapshot.ts';
import { BoardCodeForm } from './BoardCodeForm.tsx';
import { ReproductionControl } from './control-labels.ts';
import type { GameState } from '../game.ts';
import './control.css';
import './reproduction.css';

const SNAPSHOT_MAX_CHARACTERS = 65_536;

interface ReproductionProps {
  game: GameState;
  name: string;
  generation: number;
  exportSnapshot(): string;
  loadBoard(code: string): boolean;
  loadSnapshot(text: string): boolean;
  notice: string;
  paused: boolean;
  setName(name: string): void;
  resume(): void;
}

export function Reproduction({
  game,
  name,
  generation,
  exportSnapshot,
  loadBoard,
  loadSnapshot,
  notice,
  paused,
  setName,
  resume,
}: ReproductionProps) {
  const [snapshot, setSnapshot] = useState('');
  return (
    <>
      <details className="reproduction">
        <summary>{ReproductionControl.summary}</summary>
        <div className="reproduction-body">
          <label htmlFor="deal-name">{ReproductionControl.dealName}</label>
          <input
            id="deal-name"
            className="control"
            type="text"
            value={name}
            maxLength={DEAL_NAME_MAX_LENGTH}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <BoardCodeForm code={game.boardCode} generation={generation} loadBoard={loadBoard} />
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
