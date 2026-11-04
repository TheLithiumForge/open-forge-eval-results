import { SELECTION } from '../constants';
import type { GameState } from '../types';
import './ReproductionTools.css';

type Props = Readonly<{
  game: GameState;
  boardDraft: string;
  snapshotDraft: string;
  announcement: Readonly<{ id: number; text: string }>;
  onBoardDraft: (value: string) => void;
  onSnapshotDraft: (value: string) => void;
  onLoadBoard: () => void;
  onLoadSnapshot: () => void;
  onExportSnapshot: () => void;
}>;

export function ReproductionTools({
  game, boardDraft, snapshotDraft, announcement, onBoardDraft, onSnapshotDraft,
  onLoadBoard, onLoadSnapshot, onExportSnapshot,
}: Props) {
  const selection = game.selection.kind === SELECTION.MISMATCH
    ? ` Pending mismatch: ${game.selection.remainingMs}ms.`
    : '';
  const snapshotHint = `Snapshot includes ${game.matched.length / 2} matched pairs, ${game.moves} moves, ${game.elapsedMs}ms elapsed.${selection}`;
  return (
    <>
      <details className="reproduction">
        <summary>Reproduce a game</summary>
        <div className="reproduction-content">
          <div className="reproduction-field">
            <label htmlFor="board-code">Board code</label>
            <div className="field-row">
              <input id="board-code" type="text" maxLength={32} value={boardDraft}
                onChange={(event) => onBoardDraft(event.currentTarget.value)} />
              <button className="action-button" type="button" onClick={onLoadBoard}>Load board</button>
            </div>
          </div>
          <div className="reproduction-field">
            <label htmlFor="snapshot-json">Snapshot JSON</label>
            <textarea id="snapshot-json" maxLength={65_536} value={snapshotDraft}
              onChange={(event) => onSnapshotDraft(event.currentTarget.value)} />
            <span className="field-hint">{snapshotHint}</span>
            <div className="field-row">
              <button className="action-button" type="button" onClick={onExportSnapshot}>Export snapshot</button>
              <button className="action-button" type="button" onClick={onLoadSnapshot}>Load snapshot</button>
            </div>
          </div>
        </div>
      </details>
      <p className="live-status" role="status" aria-live="polite" aria-atomic="true">
        <span key={announcement.id}>{announcement.text}</span>
      </p>
    </>
  );
}
