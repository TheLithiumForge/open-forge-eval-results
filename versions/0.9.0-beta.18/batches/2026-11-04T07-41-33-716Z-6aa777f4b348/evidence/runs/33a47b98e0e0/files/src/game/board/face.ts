export const FACE_SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export const FACE_MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
export const FACE_FILLS = ['solid', 'outline'] as const;
export const FACE_COLORS = [
  { name: 'cyan', value: '#63E7FF' },
  { name: 'magenta', value: '#FF71D6' },
  { name: 'green', value: '#8BEA7D' },
  { name: 'yellow', value: '#FFE082' },
  { name: 'orange', value: '#FFB064' },
  { name: 'violet', value: '#B49AFF' },
  { name: 'rose', value: '#FF8296' },
  { name: 'ice', value: '#D9F3FF' },
] as const;

const MARKER_DIRECTIONS = [
  { x: 0, y: -40 },
  { x: 28.284, y: -28.284 },
  { x: 40, y: 0 },
  { x: 28.284, y: 28.284 },
  { x: 0, y: 40 },
  { x: -28.284, y: 28.284 },
  { x: -40, y: 0 },
  { x: -28.284, y: -28.284 },
] as const;

export interface FaceDescription {
  readonly id: number;
  readonly shape: (typeof FACE_SHAPES)[number];
  readonly marker: (typeof FACE_MARKERS)[number];
  readonly fill: (typeof FACE_FILLS)[number];
  readonly color: (typeof FACE_COLORS)[number];
  readonly markerX: number;
  readonly markerY: number;
  readonly name: string;
}

export function describeFace(id: number): FaceDescription {
  const shape = FACE_SHAPES[id % FACE_SHAPES.length];
  const markerIndex = Math.floor(id / FACE_SHAPES.length) % FACE_MARKERS.length;
  const marker = FACE_MARKERS[markerIndex];
  const fill = FACE_FILLS[Math.floor(id / 64)];
  const color = FACE_COLORS[markerIndex];
  const direction = MARKER_DIRECTIONS[markerIndex];
  if (shape === undefined || marker === undefined || fill === undefined || color === undefined || direction === undefined) {
    throw new RangeError('Face identity must be between 0 and 127');
  }
  const markerX = 50 + direction.x;
  const markerY = 50 + direction.y;
  return Object.freeze({
    id,
    shape,
    marker,
    fill,
    color,
    markerX,
    markerY,
    name: color.name + ' ' + fill + ' ' + shape + ', marker ' + marker,
  });
}
