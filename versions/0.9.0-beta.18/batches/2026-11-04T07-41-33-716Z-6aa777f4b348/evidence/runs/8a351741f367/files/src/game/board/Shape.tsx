import type { ShapeName } from './appearance.ts';

interface ShapeProps { readonly name: ShapeName; readonly color: string; readonly outline: boolean }

export function Shape({ name, color, outline }: ShapeProps) {
  const style = { fill: outline ? 'none' : color, stroke: outline ? color : 'none', strokeWidth: 5 };
  switch (name) {
    case 'circle': return <circle cx="50" cy="50" r="25" {...style} />;
    case 'square': return <rect x="25" y="25" width="50" height="50" {...style} />;
    case 'triangle': return <polygon points="50,25 75,75 25,75" {...style} />;
    case 'diamond': return <polygon points="50,25 75,50 50,75 25,50" {...style} />;
    case 'star': return <polygon points="50,25 57,41 75,43 62,55 66,75 50,65 34,75 38,55 25,43 43,41" {...style} />;
    case 'hexagon': return <polygon points="50,25 72,37.5 72,62.5 50,75 28,62.5 28,37.5" {...style} />;
    case 'plus': return <polygon points="42,25 58,25 58,42 75,42 75,58 58,58 58,75 42,75 42,58 25,58 25,42 42,42" {...style} />;
    case 'chevron': return <polygon points="25,25 50,45 75,25 75,55 50,75 25,55" {...style} />;
  }
}
