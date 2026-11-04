import type { Shape } from './faces.ts';

export interface FaceShapeProps {
  shape: Shape;
}

export function FaceShape({ shape }: FaceShapeProps) {
  switch (shape) {
    case 'circle': return <circle cx="50" cy="50" r="25" />;
    case 'square': return <rect x="25" y="25" width="50" height="50" />;
    case 'triangle': return <polygon points="50,25 75,75 25,75" />;
    case 'diamond': return <polygon points="50,25 75,50 50,75 25,50" />;
    case 'star': return <polygon points="50,25 57.35,39.89 73.78,42.27 61.89,53.86 64.69,70.23 50,62.5 35.31,70.23 38.11,53.86 26.22,42.27 42.65,39.89" />;
    case 'hexagon': return <polygon points="50,25 71.65,37.5 71.65,62.5 50,75 28.35,62.5 28.35,37.5" />;
    case 'plus': return <polygon points="40,25 60,25 60,40 75,40 75,60 60,60 60,75 40,75 40,60 25,60 25,40 40,40" />;
    case 'chevron': return <polygon points="25,25 50,45 75,25 75,50 50,75 25,50" />;
  }
}
