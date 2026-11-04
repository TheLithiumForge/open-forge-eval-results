import { faceDescription } from './face.ts';

const PATHS = {
  triangle: 'M50 25 75 75H25Z',
  diamond: 'M50 25 75 50 50 75 25 50Z',
  star: 'M50 25 57 41 75 43 62 56 66 75 50 65 34 75 38 56 25 43 43 41Z',
  hexagon: 'M37.5 28.35H62.5L75 50 62.5 71.65H37.5L25 50Z',
  plus: 'M41 25H59V41H75V59H59V75H41V59H25V41H41Z',
  chevron: 'M25 25 50 43 75 25V57L50 75 25 57Z',
} as const;

export function Face({ id }: { id: number }) {
  const face = faceDescription(id);
  const artwork = (() => {
    switch (face.shape) {
      case 'circle': return <circle cx="50" cy="50" r="25" />;
      case 'square': return <rect x="25" y="25" width="50" height="50" />;
      default: return <path d={PATHS[face.shape]} />;
    }
  })();
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g fill={face.fill === 'solid' ? face.color : 'none'} stroke={face.fill === 'outline' ? face.color : 'none'}
      strokeWidth="5" strokeLinejoin="round">{artwork}</g>
    <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
