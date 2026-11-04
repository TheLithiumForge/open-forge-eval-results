import type { GameSession } from '../session/use-game-session.ts';
import { BoardCodeControl } from './BoardCodeControl.tsx';
import { SnapshotControl } from './SnapshotControl.tsx';
import './ReproductionControls.css';

interface ReproductionControlsProps {
  readonly session: GameSession;
}

export function ReproductionControls({ session }: ReproductionControlsProps) {
  return (
    <details className="reproduction-panel">
      <summary>Reproduce a game</summary>
      <div className="reproduction-content">
        <BoardCodeControl session={session} />
        <SnapshotControl session={session} />
        <p className="control-status">{session.status}</p>
      </div>
    </details>
  );
}
