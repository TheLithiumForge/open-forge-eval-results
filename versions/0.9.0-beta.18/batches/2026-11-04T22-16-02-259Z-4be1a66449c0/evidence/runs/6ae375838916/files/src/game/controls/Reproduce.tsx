import { useEffect, useState } from 'react';
import { createGame, isWon } from '../game.ts';
import type { Game } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
type Props = { game: Game; deal: number; replace: (game: Game, paused?: boolean) => void; settle: () => Game; announce: (message: string) => void };
export function Reproduce({ game, deal, replace, settle, announce }: Props) {
  const [code, setCode] = useState(game.board.code), [snapshot, setSnapshot] = useState(''), [status, setStatus] = useState('');
  useEffect(() => { setCode(game.board.code); }, [deal, game.board.code]);
  const report = (message: string) => { setStatus(message); announce(message); };
  const loadBoard = () => {
    const next = createGame(code.trim());
    if (!next) { report('Invalid board code.'); return; }
    replace(next); report('Loaded board.');
  };
  const loadSnapshot = () => {
    const next = decodeSnapshot(snapshot);
    if (!next) { report('Invalid snapshot.'); return; }
    const won = isWon(next); replace(next, !won);
    report(won ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
  };
  return <details className="reproduce"><summary>Reproduce a game</summary>
    <div className="reproduce-content">
      <label htmlFor="board-code">Board code</label>
      <div className="input-row"><input id="board-code" maxLength={32} value={code} onChange={event => setCode(event.target.value)}/><button type="button" onClick={loadBoard}>Load board</button></div>
      <label htmlFor="snapshot">Snapshot JSON</label>
      <textarea id="snapshot" maxLength={65536} rows={6} value={snapshot} onChange={event => setSnapshot(event.target.value)} />
      <div className="input-row"><button type="button" onClick={() => setSnapshot(encodeSnapshot(settle()))}>Export snapshot</button><button type="button" onClick={loadSnapshot}>Load snapshot</button></div>
      <p className="status">{status}</p>
    </div>
  </details>;
}
