const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const DIAGONAL = 40 * Math.SQRT1_2;
const MARKERS = [
  { name: 'top', x: 50, y: 10 },
  { name: 'top-right', x: 50 + DIAGONAL, y: 50 - DIAGONAL },
  { name: 'right', x: 90, y: 50 },
  { name: 'bottom-right', x: 50 + DIAGONAL, y: 50 + DIAGONAL },
  { name: 'bottom', x: 50, y: 90 },
  { name: 'bottom-left', x: 50 - DIAGONAL, y: 50 + DIAGONAL },
  { name: 'left', x: 10, y: 50 },
  { name: 'top-left', x: 50 - DIAGONAL, y: 50 - DIAGONAL },
] as const;
const COLORS = [
  { name: 'cyan', value: '#63E7FF' }, { name: 'magenta', value: '#FF71D6' },
  { name: 'green', value: '#8BEA7D' }, { name: 'yellow', value: '#FFE082' },
  { name: 'orange', value: '#FFB064' }, { name: 'violet', value: '#B49AFF' },
  { name: 'rose', value: '#FF8296' }, { name: 'ice', value: '#D9F3FF' },
] as const;
export type FaceShape = (typeof SHAPES)[number];

export function faceIdentity(id: number) {
  if (!Number.isInteger(id) || id < 0 || id > 127) throw new RangeError('Invalid face');
  const markerIndex = Math.floor(id / 8) % 8;
  const shape = SHAPES[id % 8];
  const marker = MARKERS[markerIndex];
  const color = COLORS[markerIndex];
  if (!shape || !marker || !color) throw new RangeError('Invalid face');
  const fill = id < 64 ? 'solid' : 'outline';
  return { shape, marker, color, fill,
    name: `${color.name} ${fill} ${shape}, marker ${marker.name}` };
}
