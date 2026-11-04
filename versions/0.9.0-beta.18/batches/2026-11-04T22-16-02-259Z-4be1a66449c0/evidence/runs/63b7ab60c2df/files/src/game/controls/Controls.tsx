import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { Game } from '../game.ts';
import { createGame, isWon } from '../game.ts';
import { isSize, SIZES } from '../deck.ts';
import type { Size } from '../deck.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import './controls.css';
type Props = { game: Game; generation: number; paused: boolean; replace: (game: Game, paused?: boolean) => void; fresh: (size: Size) => Game; sync: () => Game; announce: (text: string) => void; resume: () => void; boardRef: RefObject<HTMLDivElement | null> };
export function Controls({ game, generation, paused, replace, fresh, sync, announce, resume, boardRef }: Props) {
  const [code, setCode] = useState(game.boardCode); const [snapshot, setSnapshot] = useState(''); const [status, setStatus] = useState('');
  useEffect(() => { setCode(game.boardCode); }, [generation, game.boardCode]);
  function report(text: string) { setStatus(text); announce(text); }
  return <>
    <div className="deal-controls"><label>Grid size <select value={game.size} onChange={event => { const size = Number(event.target.value); if (isSize(size) && size !== game.size) replace(fresh(size)); }}>{SIZES.map(size => <option key={size} value={size}>{size}x{size}</option>)}</select></label><button type="button" onClick={() => replace(fresh(game.size))}>New Game</button><button type="button" onClick={() => { const next = createGame(game.boardCode); if (next) replace(next); }}>Restart</button>{paused && <button type="button" onClick={() => { boardRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus(); resume(); }}>Resume</button>}</div>
    <details><summary>Reproduce a game</summary><div className="reproduce"><label htmlFor="board-code">Board code</label><div className="code-row"><input id="board-code" maxLength={32} value={code} onChange={event => setCode(event.target.value)}/><button type="button" onClick={() => { const next = createGame(code.trim()); if (!next) report('Invalid board code.'); else { replace(next); report('Loaded board.'); } }}>Load board</button></div><label htmlFor="snapshot">Snapshot JSON</label><textarea id="snapshot" maxLength={65536} value={snapshot} onChange={event => setSnapshot(event.target.value)} rows={6}/><div className="actions"><button type="button" onClick={() => setSnapshot(encodeSnapshot(sync()))}>Export snapshot</button><button type="button" onClick={() => { const next = decodeSnapshot(snapshot); if (!next) report('Invalid snapshot.'); else { const won = isWon(next); replace(next, !won); report(won ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.'); } }}>Load snapshot</button></div><p className="load-status">{status}</p></div></details>
  </>;
}
