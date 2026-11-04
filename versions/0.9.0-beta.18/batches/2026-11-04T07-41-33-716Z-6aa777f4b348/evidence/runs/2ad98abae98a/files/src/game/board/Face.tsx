import { faceParts } from './faces.ts';

const paths = {
  triangle: 'M50 25 75 75 25 75Z',
  diamond: 'M50 25 75 50 50 75 25 50Z',
  star: 'M50 25 57 41 75 43 62 55 66 75 50 65 34 75 38 55 25 43 43 41Z',
  hexagon: 'M37.5 25 62.5 25 75 50 62.5 75 37.5 75 25 50Z',
  plus: 'M42 25H58V42H75V58H58V75H42V58H25V42H42Z',
  chevron: 'M25 25 50 45 75 25V55L50 75 25 55Z',
};
export function Face({ id }: { id: number }) {
  const face = faceParts(id);
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g fill={face.outline ? 'none' : face.color} stroke={face.outline ? face.color : 'none'} strokeWidth="5" strokeLinejoin="round">
      {face.shape === 'circle' ? <circle cx="50" cy="50" r="25" />
        : face.shape === 'square' ? <rect x="25" y="25" width="50" height="50" />
        : <path d={paths[face.shape]} />}
    </g>
    <circle cx={face.x} cy={face.y} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
