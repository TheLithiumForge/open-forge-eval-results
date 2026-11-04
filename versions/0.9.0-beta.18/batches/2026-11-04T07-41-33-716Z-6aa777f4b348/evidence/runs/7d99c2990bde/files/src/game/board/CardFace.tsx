import { describeFace } from './faces.ts';

export interface CardFaceProps { readonly faceId: number }

export function CardFace({ faceId }: CardFaceProps) {
  const face = describeFace(faceId);
  const paint = { fill: face.fill === 'solid' ? face.color : 'none',
    stroke: face.fill === 'outline' ? face.color : 'none', strokeWidth: 5,
    strokeLinejoin: 'round' } as const;
  const shape = (() => {
    switch (face.shape) {
      case 'circle': return <circle cx="50" cy="50" r="22.5" {...paint} />;
      case 'square': return <rect x="27.5" y="27.5" width="45" height="45" {...paint} />;
      case 'triangle': return <path d="M50 27.5 72.5 72.5H27.5Z" {...paint} />;
      case 'diamond': return <path d="M50 27.5 72.5 50 50 72.5 27.5 50Z" {...paint} />;
      case 'star': return <path d="m50 27.5 6.6 15.5 15.9 1.6-11.7 11.2 3.8 16.7L50 63.7 35.4 72.5l3.8-16.7-11.7-11.2L43.4 43Z" {...paint} />;
      case 'hexagon': return <path d="M38.75 27.5h22.5L72.5 50 61.25 72.5h-22.5L27.5 50Z" {...paint} />;
      case 'plus': return <path d="M42 27.5h16V42h14.5v16H58v14.5H42V58H27.5V42H42Z" {...paint} />;
      case 'chevron': return <path d="M27.5 32.5 50 47.5 72.5 32.5v20L50 67.5l-22.5-15Z" {...paint} />;
    }
  })();
  return <svg className="card-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    {shape}
    <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
