import { faceIdentity } from './face-identity.ts';

export interface FaceProps { readonly id: number }

const PATHS = {
  triangle: 'M50 25 75 75 25 75Z',
  diamond: 'M50 25 75 50 50 75 25 50Z',
  star: 'M50 25 57.3 39.9 73.8 42.3 61.9 53.9 64.7 70.2 50 62.5 35.3 70.2 38.1 53.9 26.2 42.3 42.7 39.9Z',
  hexagon: 'M50 25 71.65 37.5 71.65 62.5 50 75 28.35 62.5 28.35 37.5Z',
  plus: 'M42 25H58V42H75V58H58V75H42V58H25V42H42Z',
  chevron: 'M25 25 50 45 75 25V50L50 75 25 50Z',
} as const;

export function Face({ id }: FaceProps) {
  const face = faceIdentity(id);
  const shape = face.shape === 'circle' ? <circle cx="50" cy="50" r="25" />
    : face.shape === 'square' ? <rect x="25" y="25" width="50" height="50" />
      : <path d={PATHS[face.shape]} />;
  return (
    <svg className="card-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g fill={face.fill === 'solid' ? face.color : 'none'}
        stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth="5" strokeLinejoin="round">
        {shape}
      </g>
      <circle cx={face.x} cy={face.y} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
    </svg>
  );
}
