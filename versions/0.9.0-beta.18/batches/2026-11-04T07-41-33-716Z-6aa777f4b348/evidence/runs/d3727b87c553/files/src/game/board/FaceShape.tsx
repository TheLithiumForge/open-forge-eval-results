import type { Shape } from './face.ts';

export function FaceShape({ shape }: { readonly shape: Shape }) {
  switch (shape) {
    case 'circle': return <circle cx="50" cy="50" r="25" />;
    case 'square': return <rect x="25" y="25" width="50" height="50" />;
    case 'triangle': return <path d="M50 25 75 75 25 75Z" />;
    case 'diamond': return <path d="M50 25 75 50 50 75 25 50Z" />;
    case 'star': return <path d="m50 25 7.3 16.8 17.7 1.3-13.6 11.5 4.1 17.4L50 62.8 34.5 72l4.1-17.4L25 43.1l17.7-1.3Z" />;
    case 'hexagon': return <path d="M37.5 25 62.5 25 75 50 62.5 75 37.5 75 25 50Z" />;
    case 'plus': return <path d="M42 25H58V42H75V58H58V75H42V58H25V42H42Z" />;
    case 'chevron': return <path d="M25 25H47L75 50 47 75H25L53 50Z" />;
  }
}
