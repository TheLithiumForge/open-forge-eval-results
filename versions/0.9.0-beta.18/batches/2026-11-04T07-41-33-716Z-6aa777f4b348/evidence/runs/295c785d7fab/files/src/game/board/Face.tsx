import { faceIdentity } from './face.ts';
import type { SHAPES } from './face.ts';

type Shape = (typeof SHAPES)[number];
type FaceProps = Readonly<{ id: number }>;

function ShapeArtwork({ shape }: Readonly<{ shape: Shape }>) {
  switch (shape) {
    case 'circle': return <circle cx="50" cy="50" r="22" />;
    case 'square': return <rect x="28" y="28" width="44" height="44" />;
    case 'triangle': return <path d="M50 26 74 72H26Z" />;
    case 'diamond': return <path d="M50 26 74 50 50 74 26 50Z" />;
    case 'star': return <path d="m50 26 7 16 17 2-13 12 4 17-15-9-15 9 4-17-13-12 17-2Z" />;
    case 'hexagon': return <path d="M38 28H62L74 50 62 72H38L26 50Z" />;
    case 'plus': return <path d="M42 26H58V42H74V58H58V74H42V58H26V42H42Z" />;
    case 'chevron': return <path d="m27 28 23 20 23-20v24L50 73 27 52Z" />;
  }
}

export function Face({ id }: FaceProps) {
  const face = faceIdentity(id);
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g fill={face.fill === 'solid' ? face.color : 'none'}
      stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth="5" strokeLinejoin="round">
      <ShapeArtwork shape={face.shape} />
    </g>
    <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
