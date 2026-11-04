import type { FocusEventHandler, MouseEventHandler } from 'react';
import { Face } from './Face.tsx';
import { describeFace } from './faces.ts';

export type CardProps = Readonly<{
  position: number;
  columns: number;
  faceId: number;
  visible: boolean;
  matched: boolean;
  blocked: boolean;
  tabIndex: 0 | -1;
  onActivate: (position: number) => void;
  onFocus: FocusEventHandler<HTMLButtonElement>;
  onRef: (node: HTMLButtonElement | null) => void;
}>;

export function Card({ position, columns, faceId, visible, matched, blocked, tabIndex, onActivate, onFocus, onRef }: CardProps): React.JSX.Element {
  const row = Math.floor(position / columns) + 1;
  const column = (position % columns) + 1;
  const state = matched ? 'matched' : visible ? 'revealed' : 'closed';
  const name = matched || visible
    ? `Row ${row}, column ${column}, ${faceName(faceId)}, ${state}`
    : `Row ${row}, column ${column}, closed`;

  const activate: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    onActivate(position);
  };
  const classes = ['memory-card', visible || matched ? 'memory-card--face' : 'memory-card--back'];
  if (matched) classes.push('memory-card--matched');

  return (
    <button
      ref={onRef}
      className={classes.join(' ')}
      type="button"
      data-position={position}
      aria-label={name}
      aria-disabled={matched || blocked}
      tabIndex={tabIndex}
      onClick={activate}
      onFocus={onFocus}
      style={{ scrollMargin: '6px' }}
    >
      {visible || matched ? <Face id={faceId} matched={matched} /> : <Back />}
    </button>
  );
}

function faceName(id: number): string {
  return describeFace(id).name;
}

function Back(): React.JSX.Element {
  return (
    <svg className="card-back" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <polygon points="50,27 73,50 50,73 27,50" fill="none" stroke="#757C9A" strokeWidth="4" />
    </svg>
  );
}
