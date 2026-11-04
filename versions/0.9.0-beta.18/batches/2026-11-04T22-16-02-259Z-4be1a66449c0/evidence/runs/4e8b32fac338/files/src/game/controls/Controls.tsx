import { useEffect, useState } from 'react';
import { SIZES, isSize } from '../deck';
import { createGame, isWon } from '../game';
import { decodeSnapshot, encodeSnapshot } from '../snapshot';
import type { useSession } from '../session/useSession';
import './Controls.css';
type Session = ReturnType<typeof useSession>;
export function DealControls({ session }: { session: Session }) {
  const { game, newGame, replace } = session;
  return <div className="deal-controls"><label>Grid size <select value={game.board.size} onChange={e => { const size = Number(e.target.value); if (isSize(size)) newGame(size); }}>{SIZES.map(size => <option key={size} value={size}>{size}x{size}</option>)}</select></label><button onClick={() => newGame(game.board.size)}>New Game</button><button onClick={() => { const next = createGame(game.board.code); if (next) replace(next); }}>Restart</button></div>;
}
export function Reproduction({ session }: { session: Session }) {
  const { game, deal, replace, announce, sync } = session;
  const [boardCode, setBoardCode] = useState(game.board.code), [snapshot, setSnapshot] = useState(''), [status, setStatus] = useState('');
  useEffect(() => { setBoardCode(game.board.code); }, [deal, game.board.code]);
  function report(message: string) { setStatus(message); announce(message); }
  function loadBoard() {
    const next = createGame(boardCode.trim());
    if (!next) { report('Invalid board code.'); return; }
    replace(next); setBoardCode(next.board.code); report('Loaded board.');
  }
  function loadSnapshot() {
    const next = decodeSnapshot(snapshot);
    if (!next) { report('Invalid snapshot.'); return; }
    replace(next, !isWon(next)); setBoardCode(next.board.code);
    report(isWon(next) ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
  }
  return <details className="reproduction"><summary>Reproduce a game</summary><div className="reproduction-content"><p>Use a board code to repeat a deal, or save your progress as a snapshot.</p><label>Board code <input value={boardCode} maxLength={32} onChange={e => setBoardCode(e.target.value)} spellCheck={false}/></label><div><button onClick={loadBoard}>Load board</button></div><label>Snapshot JSON <textarea value={snapshot} maxLength={65536} onChange={e => setSnapshot(e.target.value)} rows={5} spellCheck={false}/></label><div className="button-row"><button onClick={() => setSnapshot(encodeSnapshot(sync()))}>Export snapshot</button><button onClick={loadSnapshot}>Load snapshot</button></div><p className="load-status">{status}</p></div></details>;
}
