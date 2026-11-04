import type { JSX } from 'react';
import { describeFace, type FaceDescription } from './face.ts';

const FACE_BACKGROUND = '#111625';

function SolidShape({ face }: { readonly face: FaceDescription }): JSX.Element {
  const paint = face.fill === 'solid'
    ? { fill: face.color.value, stroke: 'none', strokeWidth: 0 }
    : { fill: 'none', stroke: face.color.value, strokeWidth: 5 };
  switch (face.shape) {
    case 'circle':
      return <circle cx="50" cy="50" r="25" {...paint} />;
    case 'square':
      return <rect x="25" y="25" width="50" height="50" {...paint} />;
    case 'triangle':
      return <polygon points="50,25 75,75 25,75" strokeLinejoin="round" {...paint} />;
    case 'diamond':
      return <polygon points="50,25 75,50 50,75 25,50" strokeLinejoin="round" {...paint} />;
    case 'star':
      return <polygon points="50,25 56,42 75,42 60,53 66,75 50,61 34,75 40,53 25,42 44,42" strokeLinejoin="round" {...paint} />;
    case 'hexagon':
      return <polygon points="37.5,25 62.5,25 75,50 62.5,75 37.5,75 25,50" strokeLinejoin="round" {...paint} />;
    case 'plus':
      return <polygon points="40,25 60,25 60,40 75,40 75,60 60,60 60,75 40,75 40,60 25,60 25,40 40,40" strokeLinejoin="round" {...paint} />;
    case 'chevron':
      return <path d="M25 25 H50 L75 50 L50 75 H25 L50 50 Z" strokeLinejoin="round" {...paint} />;
  }
}

export function FaceArtwork({ id }: { readonly id: number }): JSX.Element {
  const face = describeFace(id);
  return (
    <svg className="face-artwork" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <SolidShape face={face} />
      <circle
        cx={face.markerX}
        cy={face.markerY}
        r="5"
        fill={face.color.value}
        stroke={FACE_BACKGROUND}
        strokeWidth="3"
      />
    </svg>
  );
}

export function CardBack(): JSX.Element {
  return (
    <svg className="card-back" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <polygon points="50,28 72,50 50,72 28,50" fill="#757C9A" />
    </svg>
  );
}
