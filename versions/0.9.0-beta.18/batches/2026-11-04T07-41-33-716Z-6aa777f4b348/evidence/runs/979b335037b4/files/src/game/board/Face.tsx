import { faceParts } from './faces.ts';

export type FaceProps = { id: number };

export function Face({ id }: FaceProps) {
  const face = faceParts(id);
  const shape = (() => {
    switch (face.shape) {
      case 'circle': return <circle cx="50" cy="50" r="22.5" />;
      case 'square': return <rect x="27.5" y="27.5" width="45" height="45" />;
      case 'triangle': return <path d="M50 27.5 72.5 72.5H27.5Z" />;
      case 'diamond': return <path d="M50 27.5 72.5 50 50 72.5 27.5 50Z" />;
      case 'star': return <path d="m50 27.5 6.8 14.2 15.7 2.2-11.3 11 2.7 15.6L50 63.1 36.1 70.5l2.7-15.6-11.3-11 15.7-2.2Z" />;
      case 'hexagon': return <path d="M38.75 30.5h22.5L72.5 50 61.25 69.5h-22.5L27.5 50Z" />;
      case 'plus': return <path d="M42 27.5h16V42h14.5v16H58v14.5H42V58H27.5V42H42Z" />;
      case 'chevron': return <path d="m27.5 30 22.5 16L72.5 30v24L50 70 27.5 54Z" />;
    }
  })();
  return <svg className="face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g fill={face.fill === 'solid' ? face.color : 'none'}
      stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth="5" strokeLinejoin="round">
      {shape}
    </g>
    <circle cx={face.x} cy={face.y} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
