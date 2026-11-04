const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
const PALETTE = [
  { name: 'cyan', color: '#63E7FF' }, { name: 'magenta', color: '#FF71D6' },
  { name: 'green', color: '#8BEA7D' }, { name: 'yellow', color: '#FFE082' },
  { name: 'orange', color: '#FFB064' }, { name: 'violet', color: '#B49AFF' },
  { name: 'rose', color: '#FF8296' }, { name: 'ice', color: '#D9F3FF' },
] as const;
const DIAGONAL = 40 / Math.sqrt(2);
const OFFSETS = [[0, -40], [DIAGONAL, -DIAGONAL], [40, 0], [DIAGONAL, DIAGONAL],
  [0, 40], [-DIAGONAL, DIAGONAL], [-40, 0], [-DIAGONAL, -DIAGONAL]] as const;
export type ShapeName = (typeof SHAPES)[number];

export function appearance(id: number) {
  if (!Number.isInteger(id) || id < 0 || id > 127) throw new RangeError('Invalid face.');
  const markerIndex = Math.floor(id / 8) % 8;
  const shape = SHAPES[id % 8];
  const marker = MARKERS[markerIndex];
  const palette = PALETTE[markerIndex];
  const offset = OFFSETS[markerIndex];
  if (!shape || !marker || !palette || !offset) throw new Error('Missing face appearance.');
  const fill = id < 64 ? 'solid' : 'outline';
  return { shape, fill, color: palette.color, markerX: 50 + offset[0], markerY: 50 + offset[1],
    name: `${palette.name} ${fill} ${shape}, marker ${marker}` };
}
