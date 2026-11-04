import type { FaceShape } from './faceIdentity.ts';

export function Shape({ shape }: Readonly<{ shape: FaceShape }>) {
  switch (shape) {
    case 'circle': return <circle cx="50" cy="50" r="25" />;
    case 'square': return <rect x="25" y="25" width="50" height="50" />;
    case 'triangle': return <polygon points="50,25 75,75 25,75" />;
    case 'diamond': return <polygon points="50,25 75,50 50,75 25,50" />;
    case 'star': return <polygon points="50,25 58,41 75,44 62,56 66,75 50,65 34,75 38,56 25,44 42,41" />;
    case 'hexagon': return <polygon points="50,25 75,37.5 75,62.5 50,75 25,62.5 25,37.5" />;
    case 'plus': return <path d="M42 25H58V42H75V58H58V75H42V58H25V42H42Z" />;
    case 'chevron': return <polygon points="25,25 50,42 75,25 75,50 50,75 25,50" />;
  }
}
