import { faceDescription } from './faces.ts';

export type FaceProps = Readonly<{ id: number }>;

export function Face({ id }: FaceProps) {
  const face = faceDescription(id);
  let shape;
  switch (face.shape) {
    case 'circle': shape = <circle cx="50" cy="50" r="22.5" />; break;
    case 'square': shape = <rect x="27.5" y="27.5" width="45" height="45" />; break;
    case 'triangle': shape = <path d="M50 28 L72 72 H28 Z" />; break;
    case 'diamond': shape = <path d="M50 28 L72 50 L50 72 L28 50 Z" />; break;
    case 'star': shape = <path d="M50 28 L57 42 L72 44 L61 55 L64 71 L50 63 L36 71 L39 55 L28 44 L43 42 Z" />; break;
    case 'hexagon': shape = <path d="M39 28 H61 L72.5 50 L61 72 H39 L27.5 50 Z" />; break;
    case 'plus': shape = <path d="M43 28 H57 V43 H72 V57 H57 V72 H43 V57 H28 V43 H43 Z" />; break;
    case 'chevron': shape = <path d="M29 29 L50 45 L71 29 V50 L50 71 L29 50 Z" />; break;
  }
  return <svg className="face-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g fill={face.fill === 'solid' ? face.color : 'none'}
      stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth="5" strokeLinejoin="round">
      {shape}
    </g>
    <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
