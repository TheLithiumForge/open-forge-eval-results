const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const diagonal = Math.SQRT1_2;
const MARKERS = [
  { name: 'top', x: 0, y: -1 }, { name: 'top-right', x: diagonal, y: -diagonal },
  { name: 'right', x: 1, y: 0 }, { name: 'bottom-right', x: diagonal, y: diagonal },
  { name: 'bottom', x: 0, y: 1 }, { name: 'bottom-left', x: -diagonal, y: diagonal },
  { name: 'left', x: -1, y: 0 }, { name: 'top-left', x: -diagonal, y: -diagonal },
] as const;
const PALETTE = [
  { name: 'cyan', hex: '#63E7FF' }, { name: 'magenta', hex: '#FF71D6' },
  { name: 'green', hex: '#8BEA7D' }, { name: 'yellow', hex: '#FFE082' },
  { name: 'orange', hex: '#FFB064' }, { name: 'violet', hex: '#B49AFF' },
  { name: 'rose', hex: '#FF8296' }, { name: 'ice', hex: '#D9F3FF' },
] as const;

export type FaceShape = (typeof SHAPES)[number];

export function faceIdentity(id: number) {
  const shape = SHAPES[id % 8];
  const markerIndex = Math.floor(id / 8) % 8;
  const marker = MARKERS[markerIndex];
  const color = PALETTE[markerIndex];
  if (!Number.isInteger(id) || id < 0 || id > 127 || shape === undefined
    || marker === undefined || color === undefined) throw new Error('Invalid face identity.');
  const fill = id < 64 ? 'solid' : 'outline';
  return { shape, fill, color: color.hex,
    marker: { x: 50 + marker.x * 40, y: 50 + marker.y * 40 },
    name: `${color.name} ${fill} ${shape}, marker ${marker.name}` };
}
