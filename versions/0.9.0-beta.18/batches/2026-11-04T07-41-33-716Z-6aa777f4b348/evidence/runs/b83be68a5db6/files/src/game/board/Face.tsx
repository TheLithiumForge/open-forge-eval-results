import { faceParts } from './face.ts';
import type { shapeNames } from './face.ts';

const paths: Record<(typeof shapeNames)[number], string> = {
  circle: 'M50 25a25 25 0 1 0 0 50a25 25 0 1 0 0-50Z',
  square: 'M25 25H75V75H25Z',
  triangle: 'M50 25L75 75H25Z',
  diamond: 'M50 25L75 50L50 75L25 50Z',
  star: 'M50 25L57 41L75 43L62 55L65 75L50 65L35 75L38 55L25 43L43 41Z',
  hexagon: 'M37.5 25H62.5L75 50L62.5 75H37.5L25 50Z',
  plus: 'M42 25H58V42H75V58H58V75H42V58H25V42H42Z',
  chevron: 'M25 25L50 44L75 25V56L50 75L25 56Z',
};

export function Face({ id }: { id: number }) {
  const face = faceParts(id);
  return <svg viewBox="0 0 100 100" aria-hidden="true" className="face-art">
    <path d={paths[face.shape]} fill={face.fill === 'solid' ? face.color : 'none'}
      stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth="5" strokeLinejoin="round" />
    <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
