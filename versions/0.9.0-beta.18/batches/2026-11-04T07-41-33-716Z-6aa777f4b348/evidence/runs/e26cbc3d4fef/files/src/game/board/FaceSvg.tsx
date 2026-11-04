import { describeFace, fills } from './faces.ts';
import type { FaceShape } from './faces.ts';

function Shape({ shape }: { readonly shape: FaceShape }) {
  switch (shape) {
    case 'circle': return <circle cx="50" cy="50" r="22.5" />;
    case 'square': return <rect x="27.5" y="27.5" width="45" height="45" />;
    case 'triangle': return <polygon points="50,27.5 72.5,72.5 27.5,72.5" />;
    case 'diamond': return <polygon points="50,27.5 72.5,50 50,72.5 27.5,50" />;
    case 'star': return <polygon points="50,27.5 56.61,40.90 71.40,43.05 60.70,53.48 63.23,68.20 50,61.25 36.77,68.20 39.30,53.48 28.60,43.05 43.39,40.90" />;
    case 'hexagon': return <polygon points="38.75,30.5144 61.25,30.5144 72.5,50 61.25,69.4856 38.75,69.4856 27.5,50" />;
    case 'plus': return <path d="M42 27.5H58V42H72.5V58H58V72.5H42V58H27.5V42H42Z" />;
    case 'chevron': return <polygon points="27.5,27.5 50,27.5 72.5,50 50,72.5 27.5,72.5 50,50" />;
  }
}

export interface FaceSvgProps { readonly faceId: number }

export function FaceSvg({ faceId }: FaceSvgProps) {
  const face = describeFace(faceId);
  const outline = face.fill === fills.outline;
  return (
    <svg className="card-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g fill={outline ? 'none' : face.color} stroke={outline ? face.color : 'none'}
        strokeWidth="5" strokeLinejoin="round">
        <Shape shape={face.shape} />
      </g>
      <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color}
        stroke="#111625" strokeWidth="3" />
    </svg>
  );
}

export function CardBack() {
  return (
    <svg className="card-back" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="M50 32 68 50 50 68 32 50Z" fill="none" stroke="#757C9A" strokeWidth="3" />
    </svg>
  );
}
