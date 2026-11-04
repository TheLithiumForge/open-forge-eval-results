import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import './DealControls.css';

export interface DealControlsProps {
  readonly size: Size;
  readonly paused: boolean;
  readonly onNew: () => void;
  readonly onRestart: () => void;
  readonly onSize: (size: Size) => void;
  readonly onResume: () => void;
}
export function DealControls(props: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-control">Grid size
      <select value={props.size} onChange={(event) => {
        const size = Number(event.currentTarget.value);
        if (isSize(size) && size !== props.size) props.onSize(size);
      }}>{SIZES.map((size) => <option value={size} key={size}>{size}x{size}</option>)}</select>
    </label>
    <button type="button" onClick={(event) => { event.currentTarget.focus(); props.onNew(); }}>New Game</button>
    <button type="button" onClick={(event) => { event.currentTarget.focus(); props.onRestart(); }}>Restart</button>
    {props.paused && <button type="button" className="resume" onClick={props.onResume}>Resume</button>}
  </div>;
}
