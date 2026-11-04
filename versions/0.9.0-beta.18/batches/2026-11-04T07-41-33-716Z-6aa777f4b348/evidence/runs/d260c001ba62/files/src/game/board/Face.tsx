import { describeFace } from './faces.ts';

const PATHS = {
  triangle: 'M50 25 L75 75 H25 Z',
  diamond: 'M50 25 L75 50 L50 75 L25 50 Z',
  star: 'M50 25 L57.3 40 L74 42 L62 54 L65 72 L50 64 L35 72 L38 54 L26 42 L42.7 40 Z',
  hexagon: 'M37.5 28.35 H62.5 L75 50 L62.5 71.65 H37.5 L25 50 Z',
  plus: 'M42 25 H58 V42 H75 V58 H58 V75 H42 V58 H25 V42 H42 Z',
  chevron: 'M25 32 L50 50 L75 32 V55 L50 73 L25 55 Z',
};

interface FaceProps { id: number }

export function Face({ id }: FaceProps) {
  const face = describeFace(id);
  const angle = face.marker * Math.PI / 4 - Math.PI / 2;
  return <svg viewBox="0 0 100 100" aria-hidden="true" className="face-art">
    <g fill={face.fill === 'solid' ? face.color : 'none'}
      stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth="5" strokeLinejoin="round">
      {face.shape === 'circle' ? <circle cx="50" cy="50" r="25" />
        : face.shape === 'square' ? <rect x="25" y="25" width="50" height="50" />
          : <path d={PATHS[face.shape]} />}
    </g>
    <circle cx={50 + 40 * Math.cos(angle)} cy={50 + 40 * Math.sin(angle)} r="5"
      fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
