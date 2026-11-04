export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
export const PALETTE = [
  { name: 'cyan', hex: '#63E7FF' }, { name: 'magenta', hex: '#FF71D6' },
  { name: 'green', hex: '#8BEA7D' }, { name: 'yellow', hex: '#FFE082' },
  { name: 'orange', hex: '#FFB064' }, { name: 'violet', hex: '#B49AFF' },
  { name: 'rose', hex: '#FF8296' }, { name: 'ice', hex: '#D9F3FF' },
] as const;

export function describeFace(id: number) {
  const marker = Math.floor(id / 8) % 8;
  const color = PALETTE[marker] ?? PALETTE[0];
  const shape = SHAPES[id % 8] ?? SHAPES[0];
  const position = MARKERS[marker] ?? MARKERS[0];
  const fill = Math.floor(id / 64) === 0 ? 'solid' : 'outline';
  return { shape, marker, color: color.hex, fill, name: `${color.name} ${fill} ${shape}, marker ${position}` };
}
