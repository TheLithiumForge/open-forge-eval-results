import { faceIdentity } from './faceIdentity.ts';

const paths = {
  triangle: 'M50 25 L75 75 H25 Z',
  diamond: 'M50 25 L75 50 L50 75 L25 50 Z',
  star: 'M50 25 L57 41 L75 43 L62 55 L66 75 L50 65 L34 75 L38 55 L25 43 L43 41 Z',
  hexagon: 'M37.5 25 H62.5 L75 50 L62.5 75 H37.5 L25 50 Z',
  plus: 'M42 25 H58 V42 H75 V58 H58 V75 H42 V58 H25 V42 H42 Z',
  chevron: 'M25 30 L50 50 L75 30 V55 L50 75 L25 55 Z',
} as const;

export function Face({ id }: { id: number }) {
  const face = faceIdentity(id);
  const paint = { fill: face.fill === 'solid' ? face.color : 'none',
    stroke: face.fill === 'outline' ? face.color : 'none', strokeWidth: 5, strokeLinejoin: 'round' as const };
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    {face.shape === 'circle' ? <circle cx="50" cy="50" r="25" {...paint} />
      : face.shape === 'square' ? <rect x="25" y="25" width="50" height="50" {...paint} />
      : <path d={paths[face.shape]} {...paint} />}
    <circle cx={face.x} cy={face.y} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
