import { useEffect, useState } from 'react';
import { isSize, parseBoardCode, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { createGame, isWon } from '../game.ts';
import type { GameState } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
type Props = { game: GameState; generation: number; paused: boolean; newGame: (size: Size) => void; restart: () => void; replace: (game: GameState, paused: boolean) => void; sync: () => GameState; announce: (message: string) => void; resume: () => void };
export function DealControls({ game, newGame, restart }: Pick<Props, 'game' | 'newGame' | 'restart'>) {
  return <div className="deal-controls"><label>Grid size <select value={game.size} onChange={e => { const size = Number(e.target.value); if (isSize(size)) newGame(size); }}>{SIZES.map(size => <option key={size} value={size}>{size}x{size}</option>)}</select></label><button type="button" onClick={() => newGame(game.size)}>New Game</button><button type="button" onClick={restart}>Restart</button></div>;
}
export function Reproduction({ game, generation, paused, replace, sync, announce, resume }: Omit<Props, 'newGame' | 'restart'>) {
  const [code, setCode] = useState(game.boardCode); const [snapshot, setSnapshot] = useState(''); const [status, setStatus] = useState('');
  useEffect(() => { setCode(game.boardCode); }, [generation, game.boardCode]);
  function result(message: string) { setStatus(message); announce(message); }
  function loadBoard() { const value = code.trim(); if (!parseBoardCode(value)) { result('Invalid board code.'); return; } replace(createGame(value), false); setCode(value); result('Loaded board.'); }
  function loadSnapshot() { const state = decodeSnapshot(snapshot); if (!state) { result('Invalid snapshot.'); return; } const won = isWon(state); replace(state, !won); result(won ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.'); }
  return <details className="reproduction"><summary>Reproduce a game</summary><div className="repro-content">
    <label htmlFor="board-code">Board code</label><div className="input-row"><input id="board-code" maxLength={32} value={code} onChange={e => setCode(e.target.value)} /><button type="button" onClick={loadBoard}>Load board</button></div>
    <label htmlFor="snapshot">Snapshot JSON</label><textarea id="snapshot" maxLength={65536} rows={6} value={snapshot} onChange={e => setSnapshot(e.target.value)} />
    <div className="input-row"><button type="button" onClick={() => setSnapshot(encodeSnapshot(sync()))}>Export snapshot</button><button type="button" onClick={loadSnapshot}>Load snapshot</button>{paused && <button type="button" onClick={resume}>Resume</button>}</div>
    <p className="repro-status">{status}</p>
  </div></details>;
}
