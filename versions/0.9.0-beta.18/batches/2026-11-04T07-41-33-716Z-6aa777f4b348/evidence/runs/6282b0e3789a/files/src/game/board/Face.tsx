import { faceIdentity } from './faceIdentity.ts';

const PATHS = {
  triangle: 'M50 25 75 75H25Z',
  diamond: 'M50 25 75 50 50 75 25 50Z',
  star: 'M50 25 57.35 39.89 73.78 42.27 61.89 53.86 64.69 70.23 50 62.5 35.31 70.23 38.11 53.86 26.22 42.27 42.65 39.89Z',
  hexagon: 'M50 25 71.65 37.5V62.5L50 75 28.35 62.5V37.5Z',
  plus: 'M41 25H59V41H75V59H59V75H41V59H25V41H41Z',
  chevron: 'M25 25H43L75 50 43 75H25L57 50Z',
};

interface FaceProps { readonly id: number }

export function Face({ id }: FaceProps) {
  const face = faceIdentity(id);
  const paint = {
    fill: face.fill === 'solid' ? face.color : 'none',
    stroke: face.fill === 'outline' ? face.color : 'none',
    strokeWidth: face.fill === 'outline' ? 5 : 0,
    strokeLinejoin: 'round' as const,
  };
  return <svg className="card-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    {face.shape === 'circle' ? <circle cx="50" cy="50" r="25" {...paint} />
      : face.shape === 'square' ? <rect x="25" y="25" width="50" height="50" {...paint} />
        : <path d={PATHS[face.shape]} {...paint} />}
    <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
