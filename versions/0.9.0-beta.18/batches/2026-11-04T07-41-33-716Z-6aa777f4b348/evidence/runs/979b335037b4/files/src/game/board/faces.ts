export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
export const PALETTE = [
  { name: 'cyan', color: '#63E7FF' }, { name: 'magenta', color: '#FF71D6' },
  { name: 'green', color: '#8BEA7D' }, { name: 'yellow', color: '#FFE082' },
  { name: 'orange', color: '#FFB064' }, { name: 'violet', color: '#B49AFF' },
  { name: 'rose', color: '#FF8296' }, { name: 'ice', color: '#D9F3FF' },
] as const;

export function faceParts(id: number) {
  const shape = SHAPES[id % 8];
  const markerIndex = Math.floor(id / 8) % 8;
  const marker = MARKERS[markerIndex];
  const palette = PALETTE[markerIndex];
  if (!shape || !marker || !palette) throw new Error('Invalid face identity');
  const fill = id < 64 ? 'solid' : 'outline';
  const angle = markerIndex * Math.PI / 4;
  return { shape, fill, color: palette.color,
    x: 50 + Math.sin(angle) * 40, y: 50 - Math.cos(angle) * 40,
    name: `${palette.name} ${fill} ${shape}, marker ${marker}` };
}
