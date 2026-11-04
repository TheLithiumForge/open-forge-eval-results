import { useState } from 'react';
import { BoardCodeForm } from './BoardCodeForm.tsx';
import { DealNameField } from './DealNameField.tsx';
import { ReproductionControl } from './control-labels.ts';
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
  notice: string;
  paused: boolean;
  rename(name: string): void;
  resume(): void;
}

export function Reproduction({
  game,
  generation,
  exportSnapshot,
  loadBoard,
  loadSnapshot,
  notice,
  paused,
  rename,
  resume,
}: ReproductionProps) {
  const [snapshot, setSnapshot] = useState('');
  return (
    <>
      <details className="reproduction">
        <summary>{ReproductionControl.summary}</summary>
        <div className="reproduction-body">
          <BoardCodeForm code={game.boardCode} generation={generation} loadBoard={loadBoard} />
          <DealNameField name={game.name} rename={rename} />
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
