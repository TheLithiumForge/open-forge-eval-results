import { faceParts } from './faces.ts';

export interface FaceProps { readonly id: number }

export function Face({ id }: FaceProps) {
  const face = faceParts(id);
  const paint = { fill: face.fill === 'solid' ? face.color : 'none',
    stroke: face.fill === 'outline' ? face.color : 'none', strokeWidth: 5, strokeLinejoin: 'round' as const };
  const shape = (() => {
    switch (face.shape) {
      case 'circle': return <circle cx="50" cy="50" r="22.5" {...paint} />;
      case 'square': return <rect x="27.5" y="27.5" width="45" height="45" {...paint} />;
      case 'triangle': return <path d="M50 27.5 L72.5 72.5 H27.5 Z" {...paint} />;
      case 'diamond': return <path d="M50 27.5 L72.5 50 L50 72.5 L27.5 50 Z" {...paint} />;
      case 'star': return <path d="M50 27.5 L56.6 42.7 L72.5 44.2 L60.4 54.8 L64 71.5 L50 62.8 L36 71.5 L39.6 54.8 L27.5 44.2 L43.4 42.7 Z" {...paint} />;
      case 'hexagon': return <path d="M38.75 30 L61.25 30 L72.5 50 L61.25 70 L38.75 70 L27.5 50 Z" {...paint} />;
      case 'plus': return <path d="M42 27.5 H58 V42 H72.5 V58 H58 V72.5 H42 V58 H27.5 V42 H42 Z" {...paint} />;
      case 'chevron': return <path d="M27.5 27.5 L50 45 L72.5 27.5 V52.5 L50 72.5 L27.5 52.5 Z" {...paint} />;
    }
  })();
  return <svg className="face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    {shape}
    <circle cx={face.x} cy={face.y} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
