import { faceIdentity } from './faceIdentity.ts';
import type { Shape } from './faceIdentity.ts';

interface FaceProps { readonly id: number }

function ShapeArtwork({ shape }: { readonly shape: Shape }) {
  switch (shape) {
    case 'circle': return <circle cx="50" cy="50" r="22.5" />;
    case 'square': return <rect x="27.5" y="27.5" width="45" height="45" />;
    case 'triangle': return <path d="M50 28 L72 71 H28 Z" />;
    case 'diamond': return <path d="M50 28 L72 50 L50 72 L28 50 Z" />;
    case 'star': return <path d="M50 28 L57 42 L72 44 L61 55 L64 71 L50 64 L36 71 L39 55 L28 44 L43 42 Z" />;
    case 'hexagon': return <path d="M39 28 H61 L72 50 L61 72 H39 L28 50 Z" />;
    case 'plus': return <path d="M42 28 H58 V42 H72 V58 H58 V72 H42 V58 H28 V42 H42 Z" />;
    case 'chevron': return <path d="M28 28 L50 43 L72 28 V49 L50 72 L28 49 Z" />;
  }
}

export function Face({ id }: FaceProps) {
  const face = faceIdentity(id);
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100">
    <g fill={face.fill === 'solid' ? face.color : 'none'}
      stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth="5" strokeLinejoin="round">
      <ShapeArtwork shape={face.shape} />
    </g>
    <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
