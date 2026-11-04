export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
export const PALETTE = [
  { name: 'cyan', color: '#63E7FF' }, { name: 'magenta', color: '#FF71D6' },
  { name: 'green', color: '#8BEA7D' }, { name: 'yellow', color: '#FFE082' },
  { name: 'orange', color: '#FFB064' }, { name: 'violet', color: '#B49AFF' },
  { name: 'rose', color: '#FF8296' }, { name: 'ice', color: '#D9F3FF' },
] as const;

export function describeFace(id: number) {
  const marker = Math.floor(id / 8) % 8;
  const shape = SHAPES[id % 8] ?? 'circle';
  const palette = PALETTE[marker] ?? PALETTE[0];
  const fill = id < 64 ? 'solid' : 'outline';
  const position = MARKERS[marker] ?? 'top';
  const angle = marker * Math.PI / 4;
  return { shape, color: palette.color, fill,
    x: 50 + Math.sin(angle) * 40, y: 50 - Math.cos(angle) * 40,
    name: `${palette.name} ${fill} ${shape}, marker ${position}` };
}
