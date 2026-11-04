import { PALETTE } from './faces.ts';

const paths = [
  '', '', 'M50 25 75 75H25Z', 'M50 25 75 50 50 75 25 50Z',
  'M50 25 57.3 40 73.8 42.3 61.9 54 64.7 70.2 50 62.5 35.3 70.2 38.1 54 26.2 42.3 42.7 40Z',
  'M37.5 28.35H62.5L75 50 62.5 71.65H37.5L25 50Z',
  'M42 25H58V42H75V58H58V75H42V58H25V42H42Z',
  'M25 25 50 45 75 25V55L50 75 25 55Z',
] as const;

export function Face({ id }: { id: number }) {
  const shape = id % 8;
  const marker = Math.floor(id / 8) % 8;
  const angle = marker * Math.PI / 4;
  const color = PALETTE[marker];
  const style = { fill: id < 64 ? color : 'none', stroke: id < 64 ? 'none' : color, strokeWidth: 5 };
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g {...style} strokeLinejoin="round">
      {shape === 0 ? <circle cx="50" cy="50" r="25" /> : shape === 1
        ? <rect x="25" y="25" width="50" height="50" /> : <path d={paths[shape]} />}
    </g>
    <circle cx={50 + Math.sin(angle) * 40} cy={50 - Math.cos(angle) * 40}
      r="5" fill={color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
