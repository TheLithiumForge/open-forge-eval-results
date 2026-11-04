export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
export const PALETTE = [
  { name: 'cyan', color: '#63E7FF' }, { name: 'magenta', color: '#FF71D6' },
  { name: 'green', color: '#8BEA7D' }, { name: 'yellow', color: '#FFE082' },
  { name: 'orange', color: '#FFB064' }, { name: 'violet', color: '#B49AFF' },
  { name: 'rose', color: '#FF8296' }, { name: 'ice', color: '#D9F3FF' },
] as const;

export function faceDescription(id: number) {
  const marker = Math.floor(id / 8) % 8;
  const palette = PALETTE[marker] ?? PALETTE[0];
  const shape = SHAPES[id % 8] ?? SHAPES[0];
  const position = MARKERS[marker] ?? MARKERS[0];
  const fill = Math.floor(id / 64) === 0 ? 'solid' : 'outline';
  const angle = (marker * Math.PI) / 4;
  return { shape, fill, color: palette.color,
    markerX: 50 + 40 * Math.sin(angle), markerY: 50 - 40 * Math.cos(angle),
    name: palette.name + ' ' + fill + ' ' + shape + ', marker ' + position };
}
