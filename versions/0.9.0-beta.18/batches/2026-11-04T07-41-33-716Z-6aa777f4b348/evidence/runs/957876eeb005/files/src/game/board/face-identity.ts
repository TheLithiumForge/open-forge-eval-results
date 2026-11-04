export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
export const FILLS = ['solid', 'outline'] as const;
export const PALETTE = [
  { name: 'cyan', color: '#63E7FF' }, { name: 'magenta', color: '#FF71D6' },
  { name: 'green', color: '#8BEA7D' }, { name: 'yellow', color: '#FFE082' },
  { name: 'orange', color: '#FFB064' }, { name: 'violet', color: '#B49AFF' },
  { name: 'rose', color: '#FF8296' }, { name: 'ice', color: '#D9F3FF' },
] as const;
const DIAGONAL = 40 / Math.sqrt(2);
const OFFSETS = [
  [0, -40], [DIAGONAL, -DIAGONAL], [40, 0], [DIAGONAL, DIAGONAL],
  [0, 40], [-DIAGONAL, DIAGONAL], [-40, 0], [-DIAGONAL, -DIAGONAL],
] as const;

export function faceIdentity(id: number) {
  if (!Number.isInteger(id) || id < 0 || id > 127) throw new Error('Invalid face identity');
  const markerIndex = Math.floor(id / 8) % 8;
  const shape = SHAPES[id % 8];
  const marker = MARKERS[markerIndex];
  const fill = FILLS[Math.floor(id / 64)];
  const palette = PALETTE[markerIndex];
  const offset = OFFSETS[markerIndex];
  if (shape === undefined || marker === undefined || fill === undefined || palette === undefined || offset === undefined) {
    throw new Error('Incomplete face identity');
  }
  return {
    shape, marker, fill, color: palette.color, x: 50 + offset[0], y: 50 + offset[1],
    name: `${palette.name} ${fill} ${shape}, marker ${marker}`,
  };
}
