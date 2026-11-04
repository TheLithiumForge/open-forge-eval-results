import { describeFace } from './faces.ts';

export type FaceProps = Readonly<{ id: number }>;
export function Face({ id }: FaceProps) {
  const face = describeFace(id);
  function shape() {
    switch (face.shape) {
      case 'circle': return <circle cx="50" cy="50" r="22.5" />;
      case 'square': return <rect x="27.5" y="27.5" width="45" height="45" />;
      case 'triangle': return <path d="M50 27.5 72.5 71.5H27.5Z" />;
      case 'diamond': return <path d="m50 27.5 22.5 22.5L50 72.5 27.5 50Z" />;
      case 'star': return <path d="m50 27.5 6.9 14 15.6 2.3-11.3 11 2.7 15.5L50 63l-13.9 7.3 2.7-15.5-11.3-11L43.1 41.5Z" />;
      case 'hexagon': return <path d="M38.75 30.5h22.5L72.5 50 61.25 69.5h-22.5L27.5 50Z" />;
      case 'plus': return <path d="M42 27.5h16V42h14.5v16H58v14.5H42V58H27.5V42H42Z" />;
      case 'chevron': return <path d="m27.5 27.5 22.5 21 22.5-21v24L50 72.5l-22.5-21Z" />;
    }
  }
  return <svg className="face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g fill={face.fill === 'solid' ? face.color : 'none'}
      stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth="5" strokeLinejoin="round">
      {shape()}
    </g>
    <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
