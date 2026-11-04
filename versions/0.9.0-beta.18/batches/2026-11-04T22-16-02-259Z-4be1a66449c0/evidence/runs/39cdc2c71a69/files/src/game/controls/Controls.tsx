import { useEffect, useState } from 'react';
import { SIZES, isSize, parseBoardCode } from '../deck.ts';
import { createGame, isWon } from '../game.ts';
import type { Game } from '../game.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import type { Size } from '../deck.ts';
export function Controls({ game, deal, paused, replace, fresh, sync, announce, resume }: { game: Game; deal: number; paused: boolean; replace: (game: Game, paused?: boolean) => void; fresh: (size: Size) => Game; sync: () => Game; announce: (text: string) => void; resume: () => void }) {
  const [code, setCode] = useState(game.boardCode), [snapshot, setSnapshot] = useState(''), [status, setStatus] = useState('');
  useEffect(() => { setCode(game.boardCode); }, [deal, game.boardCode]);
  function report(text: string) { setStatus(text); announce(text); }
  return <>
    <div className="deal-controls"><label>Grid size <select value={game.size} onChange={event => { const size = Number(event.target.value); if (isSize(size)) replace(fresh(size)); }}>{SIZES.map(size => <option value={size} key={size}>{size}x{size}</option>)}</select></label><button onClick={() => replace(fresh(game.size))}>New Game</button><button onClick={() => replace(createGame(game.boardCode))}>Restart</button>{paused && <button onClick={resume}>Resume</button>}</div>
    <details><summary>Reproduce a game</summary><div className="reproduction"><label>Board code<input value={code} maxLength={32} onChange={event => setCode(event.target.value)}/></label><button onClick={() => { const value = code.trim(); if (!parseBoardCode(value)) report('Invalid board code.'); else { replace(createGame(value)); report('Loaded board.'); } }}>Load board</button><label>Snapshot JSON<textarea value={snapshot} maxLength={65536} rows={7} onChange={event => setSnapshot(event.target.value)}/></label><div className="button-row"><button onClick={() => setSnapshot(encodeSnapshot(sync()))}>Export snapshot</button><button onClick={() => { const loaded = decodeSnapshot(snapshot); if (!loaded) report('Invalid snapshot.'); else { const won = isWon(loaded); replace(loaded, !won); report(won ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.'); } }}>Load snapshot</button></div><p className="load-status">{status}</p></div></details>
  </>;
}
