import { faceParts } from './faces.ts';

export function Face({ id }: { id: number }) {
  const face = faceParts(id);
  let shape;
  switch (face.shape) {
    case 'circle': shape = <circle cx="50" cy="50" r="22.5" />; break;
    case 'square': shape = <rect x="27.5" y="27.5" width="45" height="45" />; break;
    case 'triangle': shape = <path d="M50 27.5 72.5 72.5 27.5 72.5Z" />; break;
    case 'diamond': shape = <path d="M50 27.5 72.5 50 50 72.5 27.5 50Z" />; break;
    case 'star': shape = <path d="m50 27.5 6.6 14.5 15.9 1.1-12 10.5 3.4 15.9L50 61.5 36.1 69.5 39.5 53.6 27.5 43.1 43.4 42Z" />; break;
    case 'hexagon': shape = <path d="M38.75 30.5H61.25L72.5 50 61.25 69.5H38.75L27.5 50Z" />; break;
    case 'plus': shape = <path d="M42 27.5H58V42H72.5V58H58V72.5H42V58H27.5V42H42Z" />; break;
    case 'chevron': shape = <path d="M27.5 38 38 27.5 72.5 50 38 72.5 27.5 62 50 50Z" />; break;
  }
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g fill={face.fill === 'solid' ? face.color : 'none'}
      stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth="5" strokeLinejoin="round">
      {shape}
    </g>
    <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
