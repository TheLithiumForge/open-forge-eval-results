import { describeFace } from './faces.ts';
import type { SHAPES } from './faces.ts';

function Shape({ shape }: { shape: (typeof SHAPES)[number] }) {
  switch (shape) {
    case 'circle': return <circle cx="50" cy="50" r="25" />;
    case 'square': return <rect x="25" y="25" width="50" height="50" />;
    case 'triangle': return <path d="M50 25 75 75H25Z" />;
    case 'diamond': return <path d="m50 25 25 25-25 25-25-25Z" />;
    case 'star': return <path d="m50 25 7.4 16 17.6 2.1-13 12 3.5 18L50 64.5 34.5 73l3.5-18-13-12L42.6 41Z" />;
    case 'hexagon': return <path d="M37.5 25h25L75 50 62.5 75h-25L25 50Z" />;
    case 'plus': return <path d="M42 25h16v17h17v16H58v17H42V58H25V42h17Z" />;
    case 'chevron': return <path d="m25 25 25 20 25-20v25L50 75 25 50Z" />;
  }
}

export function Face({ id }: { id: number }) {
  const face = describeFace(id);
  return <svg viewBox="0 0 100 100" aria-hidden="true" className="face">
    <g fill={face.fill === 'solid' ? face.color : 'none'}
      stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth="5" strokeLinejoin="round">
      <Shape shape={face.shape} />
    </g>
    <circle cx={face.x} cy={face.y} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
