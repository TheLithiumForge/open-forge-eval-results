import { faceIdentity } from './faceIdentity.ts';

type CardFaceProps = Readonly<{ id: number }>;

export function CardFace({ id }: CardFaceProps) {
  const face = faceIdentity(id);
  const paint = { fill: face.fill === 'solid' ? face.color : 'none',
    stroke: face.fill === 'outline' ? face.color : 'none', strokeWidth: 5, strokeLinejoin: 'round' } as const;
  function shape() {
    switch (face.shape) {
      case 'circle': return <circle cx="50" cy="50" r="25" {...paint} />;
      case 'square': return <rect x="25" y="25" width="50" height="50" {...paint} />;
      case 'triangle': return <polygon points="50,25 75,75 25,75" {...paint} />;
      case 'diamond': return <polygon points="50,25 75,50 50,75 25,50" {...paint} />;
      case 'star': return <polygon points="50,25 56,42 74,42 60,53 65,72 50,61 35,72 40,53 26,42 44,42" {...paint} />;
      case 'hexagon': return <polygon points="25,50 37.5,28.35 62.5,28.35 75,50 62.5,71.65 37.5,71.65" {...paint} />;
      case 'plus': return <polygon points="42,25 58,25 58,42 75,42 75,58 58,58 58,75 42,75 42,58 25,58 25,42 42,42" {...paint} />;
      case 'chevron': return <polygon points="28,25 50,47 72,25 75,47 50,75 25,47" {...paint} />;
    }
  }
  return <svg className="card-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    {shape()}
    <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
