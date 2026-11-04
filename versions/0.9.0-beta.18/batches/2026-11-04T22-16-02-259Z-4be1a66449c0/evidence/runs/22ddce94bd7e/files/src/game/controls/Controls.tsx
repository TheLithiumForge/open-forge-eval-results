import { useEffect, useState } from 'react';
import { SIZES, isSize } from '../deck.ts';
import type { GameState } from '../state.ts';
import './controls.css';
type Props = { game: GameState; generation: number; status: string; paused: boolean; newGame: (size: GameState['size']) => void; restart: () => void; loadBoard: (draft: string) => boolean; loadSnapshot: (draft: string) => boolean; exportSnapshot: () => string; resume: () => void };
export function Controls({ game, generation, status, paused, newGame, restart, loadBoard, loadSnapshot, exportSnapshot, resume }: Props) {
  const [code, setCode] = useState(game.boardCode), [snapshot, setSnapshot] = useState('');
  useEffect(() => setCode(game.boardCode), [generation, game.boardCode]);
  return <>
    <div className="deal-controls">
      <label>Grid size <select value={game.size} onChange={event => { const size = Number(event.target.value); if (isSize(size)) newGame(size); }}>{SIZES.map(size => <option key={size} value={size}>{size}x{size}</option>)}</select></label>
      <button type="button" onClick={() => newGame(game.size)}>New Game</button>
      <button type="button" onClick={restart}>Restart</button>
      {paused && <button type="button" onClick={resume}>Resume</button>}
    </div>
    <details className="reproduction"><summary>Reproduce a game</summary>
      <p>Share a board code to repeat a deal, or save your progress as a snapshot.</p>
      <div className="input-row"><label htmlFor="board-code">Board code</label><input id="board-code" value={code} maxLength={32} onChange={event => setCode(event.target.value)} /><button type="button" onClick={() => { if (loadBoard(code)) setCode(code.trim()); }}>Load board</button></div>
      <div className="snapshot-controls"><label htmlFor="snapshot">Snapshot JSON</label><textarea id="snapshot" rows={5} value={snapshot} maxLength={65536} onChange={event => setSnapshot(event.target.value)} /><div className="button-row"><button type="button" onClick={() => setSnapshot(exportSnapshot())}>Export snapshot</button><button type="button" onClick={() => loadSnapshot(snapshot)}>Load snapshot</button></div></div>
      <p className="load-status">{status}</p>
    </details>
  </>;
}
