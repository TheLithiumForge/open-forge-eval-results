import { Face, BackFace } from './Face.tsx';
import { getFaceData } from './faceData.ts';

type CardProps = {
  index: number;
  size: number;
  faceId: number;
  visible: boolean;
  matched: boolean;
  tabIndex: number;
  onActivate: (index: number) => void;
  onFocus: (index: number, element: HTMLButtonElement) => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
};

export function Card({ index, size, faceId, visible, matched, tabIndex, onActivate, onFocus, buttonRef }: CardProps) {
  const row = Math.floor(index / size) + 1;
  const column = index % size + 1;
  const stateName = matched ? 'matched' : visible ? 'revealed' : 'closed';
  const name = visible ? `Row ${row}, column ${column}, ${getFaceData(faceId).name}, ${stateName}` : `Row ${row}, column ${column}, closed`;
  return (
    <button
      type="button"
      className={`card${visible ? ' card--revealed' : ''}${matched ? ' card--matched' : ''}`}
      ref={buttonRef}
      aria-label={name}
      aria-disabled={matched ? 'true' : undefined}
      tabIndex={tabIndex}
      onClick={() => onActivate(index)}
      onFocus={(event) => onFocus(index, event.currentTarget)}
    >
      {visible ? <Face faceId={faceId} /> : <BackFace />}
      {matched && <span className="card-check" aria-hidden="true">✓</span>}
    </button>
  );
}
