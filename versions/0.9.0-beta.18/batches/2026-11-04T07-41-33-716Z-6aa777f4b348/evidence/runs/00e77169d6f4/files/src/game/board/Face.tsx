const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
const PALETTE = [
  ['cyan', '#63E7FF'], ['magenta', '#FF71D6'], ['green', '#8BEA7D'], ['yellow', '#FFE082'],
  ['orange', '#FFB064'], ['violet', '#B49AFF'], ['rose', '#FF8296'], ['ice', '#D9F3FF'],
] as const;
const PATHS = [
  '', 'M25 25H75V75H25Z', 'M50 25 75 75H25Z', 'M50 25 75 50 50 75 25 50Z',
  'M50 25 57 41 75 43 62 55 66 74 50 64 34 74 38 55 25 43 43 41Z',
  'M38 25H62L75 50 62 75H38L25 50Z',
  'M42 25H58V42H75V58H58V75H42V58H25V42H42Z',
  'M25 27 50 48 75 27V51L50 73 25 51Z',
] as const;

export function faceName(id: number): string {
  const marker = Math.floor(id / 8) % 8;
  return `${PALETTE[marker]?.[0]} ${id < 64 ? 'solid' : 'outline'} ${SHAPES[id % 8]}, marker ${MARKERS[marker]}`;
}

export function Face({ id }: { id: number }) {
  const shape = id % 8;
  const marker = Math.floor(id / 8) % 8;
  const color = PALETTE[marker]?.[1];
  const angle = (marker * Math.PI / 4) - Math.PI / 2;
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g fill={id < 64 ? color : 'none'} stroke={id >= 64 ? color : 'none'} strokeWidth="5" strokeLinejoin="round">
      {shape === 0 ? <circle cx="50" cy="50" r="25" /> : <path d={PATHS[shape]} />}
    </g>
    <circle cx={50 + Math.cos(angle) * 40} cy={50 + Math.sin(angle) * 40} r="5" fill={color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
