import type { FaceIdentity } from './faceIdentity.ts';
import { FACE_BACKGROUND, faceIdentity, markerPoint } from './faceIdentity.ts';

interface FaceArtProps {
  readonly id: number;
}

function shapePath(shape: FaceIdentity['shape']): string {
  switch (shape) {
    case 'circle': return '';
    case 'square': return 'M26 26H74V74H26Z';
    case 'triangle': return 'M50 26L74 72H26Z';
    case 'diamond': return 'M50 26L74 50L50 74L26 50Z';
    case 'star': return 'M50 26L56 43L74 43L59 54L65 72L50 61L35 72L41 54L26 43L44 43Z';
    case 'hexagon': return 'M38 26H62L74 50L62 74H38L26 50Z';
    case 'plus': return 'M42 26H58V42H74V58H58V74H42V58H26V42H42Z';
    case 'chevron': return 'M30 28L70 50L30 72V58L45 50L30 42Z';
    default: {
      const unreachable: never = shape;
      return unreachable;
    }
  }
}

export function FaceArt({ id }: FaceArtProps) {
  const face = faceIdentity(id);
  const [markerX, markerY] = markerPoint(face.marker);
  const path = shapePath(face.shape);
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100" className="face-art">
      {face.shape === 'circle' ? (
        <circle cx="50" cy="50" r="24" {...(face.fill === 'solid'
          ? { fill: face.color }
          : { fill: 'none', stroke: face.color, strokeWidth: 5 })} />
      ) : (
        <path d={path} strokeLinejoin="round" {...(face.fill === 'solid'
          ? { fill: face.color }
          : { fill: 'none', stroke: face.color, strokeWidth: 5 })} />
      )}
      <circle cx={markerX} cy={markerY} r="5" fill={face.color} stroke={FACE_BACKGROUND} strokeWidth="3" />
    </svg>
  );
}
