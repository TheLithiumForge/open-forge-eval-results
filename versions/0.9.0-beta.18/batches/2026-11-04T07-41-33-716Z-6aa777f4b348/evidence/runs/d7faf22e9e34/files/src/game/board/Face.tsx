import { faceIdentity } from './faces.ts';
import type { FaceShape } from './faces.ts';

const STAR = Array.from({ length: 10 }, (_, index) => {
  const angle = -Math.PI / 2 + index * Math.PI / 5;
  const radius = index % 2 === 0 ? 22.5 : 10;
  return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
}).join(' ');

function Shape({ shape }: { readonly shape: FaceShape }) {
  switch (shape) {
    case 'circle': return <circle cx="50" cy="50" r="22.5" />;
    case 'square': return <rect x="27.5" y="27.5" width="45" height="45" />;
    case 'triangle': return <path d="M50 27.5 72.5 72.5H27.5Z" />;
    case 'diamond': return <path d="M50 27.5 72.5 50 50 72.5 27.5 50Z" />;
    case 'star': return <polygon points={STAR} />;
    case 'hexagon': return <path d="M38.75 30.514H61.25L72.5 50 61.25 69.486H38.75L27.5 50Z" />;
    case 'plus': return <path d="M42 27.5H58V42H72.5V58H58V72.5H42V58H27.5V42H42Z" />;
    case 'chevron': return <path d="M29 27.5H52L72.5 50 52 72.5H29L49.5 50Z" />;
  }
}

export function Face({ id }: { readonly id: number }) {
  const face = faceIdentity(id);
  const outline = face.fill === 'outline';
  return <svg className="card-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g fill={outline ? 'none' : face.color.value} stroke={outline ? face.color.value : 'none'}
      strokeWidth={outline ? 5 : 0} strokeLinejoin="round">
      <Shape shape={face.shape} />
    </g>
    <circle cx={face.marker.x} cy={face.marker.y} r="5" fill={face.color.value}
      stroke="#111625" strokeWidth="3" />
  </svg>;
}
