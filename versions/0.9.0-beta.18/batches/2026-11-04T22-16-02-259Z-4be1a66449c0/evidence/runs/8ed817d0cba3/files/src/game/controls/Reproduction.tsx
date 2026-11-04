import { useEffect, useState } from 'react';
import { createGame, isWon } from '../game.ts';
import type { Game } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
export function Reproduction({ game, generation, sync, replace, announce }: { game: Game; generation: number; sync: () => Game; replace: (game: Game, imported?: boolean) => void; announce: (text: string) => void }) {
  const [code, setCode] = useState(game.board.code), [snapshot, setSnapshot] = useState(''), [status, setStatus] = useState('');
  useEffect(() => { setCode(game.board.code); }, [generation, game.board.code]);
  function message(text: string) { setStatus(text); announce(text); }
  function loadBoard() {
    const next = createGame(code.trim());
    if (!next) { message('Invalid board code.'); return; }
    replace(next); message('Loaded board.');
  }
  function loadSnapshot() {
    const next = decodeSnapshot(snapshot);
    if (!next) { message('Invalid snapshot.'); return; }
    replace(next, true); message(isWon(next) ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
  }
  return <details className="reproduction"><summary>Reproduce a game</summary><div className="reproduction-content">
    <label>Board code <input value={code} maxLength={32} onChange={event => setCode(event.target.value)} /></label><button onClick={loadBoard}>Load board</button>
    <label>Snapshot JSON <textarea value={snapshot} maxLength={65536} rows={6} onChange={event => setSnapshot(event.target.value)} /></label>
    <div className="actions"><button onClick={() => setSnapshot(encodeSnapshot(sync()))}>Export snapshot</button><button onClick={loadSnapshot}>Load snapshot</button></div>
    <p className="repro-status">{status}</p>
  </div></details>;
}
