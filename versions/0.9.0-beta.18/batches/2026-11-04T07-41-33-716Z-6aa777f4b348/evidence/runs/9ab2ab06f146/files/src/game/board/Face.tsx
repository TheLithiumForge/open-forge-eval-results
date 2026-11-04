import { PALETTE } from './faces.ts';

type Props = { id: number };
const PATHS = [
  '', 'M25 25H75V75H25Z', 'M50 25L75 75H25Z', 'M50 25L75 50L50 75L25 50Z',
  'M50 25L57 41L75 43L61 55L65 75L50 65L35 75L39 55L25 43L43 41Z',
  'M37.5 25H62.5L75 50L62.5 75H37.5L25 50Z',
  'M42 25H58V42H75V58H58V75H42V58H25V42H42Z',
  'M25 25L50 45L75 25V53L50 75L25 53Z',
];

export function Face({ id }: Props) {
  const shape = id % 8;
  const marker = Math.floor(id / 8) % 8;
  const color = PALETTE[marker];
  const angle = marker * Math.PI / 4;
  const style = { fill: id < 64 ? color : 'none', stroke: id < 64 ? 'none' : color, strokeWidth: 5 };
  return <svg className="card-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    {shape === 0 ? <circle cx="50" cy="50" r="25" {...style} /> : <path d={PATHS[shape]} {...style} />}
    <circle cx={50 + 40 * Math.sin(angle)} cy={50 - 40 * Math.cos(angle)} r="5"
      fill={color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
