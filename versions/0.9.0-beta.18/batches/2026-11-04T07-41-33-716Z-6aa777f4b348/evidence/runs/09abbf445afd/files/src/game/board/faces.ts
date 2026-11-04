const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
const PALETTE = [
  { name: 'cyan', color: '#63E7FF' },
  { name: 'magenta', color: '#FF71D6' },
  { name: 'green', color: '#8BEA7D' },
  { name: 'yellow', color: '#FFE082' },
  { name: 'orange', color: '#FFB064' },
  { name: 'violet', color: '#B49AFF' },
  { name: 'rose', color: '#FF8296' },
  { name: 'ice', color: '#D9F3FF' },
] as const;

export type ShapeName = (typeof SHAPES)[number];
export type MarkerName = (typeof MARKERS)[number];
export type FaceDescription = Readonly<{
  shape: ShapeName;
  marker: MarkerName;
  outline: boolean;
  color: string;
  name: string;
  markerX: number;
  markerY: number;
}>;

const MARKER_OFFSETS = [
  [0, -40], [28.284, -28.284], [40, 0], [28.284, 28.284],
  [0, 40], [-28.284, 28.284], [-40, 0], [-28.284, -28.284],
] as const;

export function describeFace(id: number): FaceDescription {
  const shape = SHAPES[id % 8] ?? SHAPES[0];
  const markerIndex = Math.floor(id / 8) % 8;
  const marker = MARKERS[markerIndex] ?? MARKERS[0];
  const palette = PALETTE[markerIndex] ?? PALETTE[0];
  const outline = Math.floor(id / 64) === 1;
  const offset = MARKER_OFFSETS[markerIndex] ?? MARKER_OFFSETS[0];
  const fill = outline ? 'outline' : 'solid';
  return {
    shape,
    marker,
    outline,
    color: palette.color,
    markerX: 50 + offset[0],
    markerY: 50 + offset[1],
    name: `${palette.name} ${fill} ${shape}, marker ${marker}`,
  };
}
