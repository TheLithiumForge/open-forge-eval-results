export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
export const PALETTE = [
  { name: 'cyan', color: '#63E7FF' }, { name: 'magenta', color: '#FF71D6' },
  { name: 'green', color: '#8BEA7D' }, { name: 'yellow', color: '#FFE082' },
  { name: 'orange', color: '#FFB064' }, { name: 'violet', color: '#B49AFF' },
  { name: 'rose', color: '#FF8296' }, { name: 'ice', color: '#D9F3FF' },
] as const;

export function faceDescription(id: number) {
  const shape = SHAPES[id % 8] ?? 'circle';
  const markerIndex = Math.floor(id / 8) % 8;
  const marker = MARKERS[markerIndex] ?? 'top';
  const palette = PALETTE[markerIndex] ?? PALETTE[0];
  const fill = id < 64 ? 'solid' : 'outline';
  const angle = markerIndex * Math.PI / 4;
  return {
    shape, fill, color: palette.color,
    name: `${palette.name} ${fill} ${shape}, marker ${marker}`,
    markerX: 50 + 40 * Math.sin(angle), markerY: 50 - 40 * Math.cos(angle),
  };
}
