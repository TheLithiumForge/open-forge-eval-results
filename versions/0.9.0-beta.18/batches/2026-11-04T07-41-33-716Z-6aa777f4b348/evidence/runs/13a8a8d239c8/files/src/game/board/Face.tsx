import type { ReactNode } from 'react';
import { faceIdentity } from './faces.ts';
import './Face.css';

const MARKER_OFFSETS = [
  [0, -40], [28.284, -28.284], [40, 0], [28.284, 28.284],
  [0, 40], [-28.284, 28.284], [-40, 0], [-28.284, -28.284],
] as const;

interface FaceProps {
  readonly faceId: number;
}

function starPoints(): string {
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? 23 : 10.5;
    const angle = (Math.PI * (index * 36 - 90)) / 180;
    return `${50 + radius * Math.cos(angle)},${50 + radius * Math.sin(angle)}`;
  }).join(' ');
}

function shapeFor(shape: string, color: string, fill: string): ReactNode {
  const style = { fill, stroke: fill === 'none' ? color : 'none', strokeWidth: fill === 'none' ? 5 : 0, strokeLinejoin: 'round' as const };
  if (shape === 'circle') return <circle cx="50" cy="50" r="22" {...style} />;
  if (shape === 'square') return <rect x="31" y="31" width="38" height="38" {...style} />;
  if (shape === 'triangle') return <polygon points="50,28 72,70 28,70" {...style} />;
  if (shape === 'diamond') return <polygon points="50,27 73,50 50,73 27,50" {...style} />;
  if (shape === 'star') return <polygon points={starPoints()} {...style} />;
  if (shape === 'hexagon') return <polygon points="50,27 70,38.5 70,61.5 50,73 30,61.5 30,38.5" {...style} />;
  if (shape === 'plus') return <path d="M42 28H58V42H72V58H58V72H42V58H28V42H42Z" {...style} />;
  return <path d="M31 28H48L72 50 48 72H31L55 50Z" {...style} />;
}

export function Face({ faceId }: FaceProps) {
  const face = faceIdentity(faceId);
  const [offsetX, offsetY] = MARKER_OFFSETS[Math.floor(faceId / 8) % MARKER_OFFSETS.length] ?? [0, -40];
  const fill = face.fill === 'solid' ? face.color : 'none';
  const markerX = 50 + offsetX;
  const markerY = 50 + offsetY;

  return (
    <svg className="face-artwork" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {shapeFor(face.shape, face.color, fill)}
      <circle className="face-marker" cx={markerX} cy={markerY} r="5" fill={face.color} />
    </svg>
  );
}
