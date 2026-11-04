import { faceIdentity } from './faceIdentity.ts';

type FaceProps = Readonly<{ id: number }>;

export function Face({ id }: FaceProps) {
  const face = faceIdentity(id);
  const style = {
    fill: face.fill === 'solid' ? face.color : 'none',
    stroke: face.fill === 'outline' ? face.color : 'none',
    strokeWidth: 5,
    strokeLinejoin: 'round' as const,
  };
  function shape() {
    switch (face.shape) {
      case 'circle': return <circle cx="50" cy="50" r="25" />;
      case 'square': return <rect x="25" y="25" width="50" height="50" />;
      case 'triangle': return <path d="M50 25 75 75 25 75Z" />;
      case 'diamond': return <path d="M50 25 75 50 50 75 25 50Z" />;
      case 'star': return <path d="m50 25 7.4 15.1L74 42.5 62 54.2 64.8 71 50 63.2 35.2 71 38 54.2 26 42.5 42.6 40.1Z" />;
      case 'hexagon': return <path d="M37.5 25 62.5 25 75 50 62.5 75 37.5 75 25 50Z" />;
      case 'plus': return <path d="M42 25H58V42H75V58H58V75H42V58H25V42H42Z" />;
      case 'chevron': return <path d="M25 25 50 42 75 25V52L50 75 25 52Z" />;
    }
  }
  return <svg className="card-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g {...style}>{shape()}</g>
    <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
