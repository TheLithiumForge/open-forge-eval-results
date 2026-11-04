const COLORS = ['#63E7FF', '#FF71D6', '#8BEA7D', '#FFE082', '#FFB064', '#B49AFF', '#FF8296', '#D9F3FF'] as const;
const COLOR_NAMES = ['cyan', 'magenta', 'green', 'yellow', 'orange', 'violet', 'rose', 'ice'] as const;
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
const POINTS = [
  '',
  '27,27 73,27 73,73 27,73',
  '50,26 75,72 25,72',
  '50,26 74,50 50,74 26,50',
  '50,26 56,42 74,42 60,53 65,72 50,61 35,72 40,53 26,42 44,42',
  '50,26 71,38 71,62 50,74 29,62 29,38',
  '38,27 62,27 62,42 74,42 74,58 62,58 62,73 38,73 38,58 26,58 26,42 38,42',
  '27,28 73,50 27,72 38,50',
] as const;
const MARKER_OFFSETS = [
  [0, -40], [28.284, -28.284], [40, 0], [28.284, 28.284],
  [0, 40], [-28.284, 28.284], [-40, 0], [-28.284, -28.284],
] as const;

type FaceShape = typeof SHAPES[number];
type MarkerPosition = typeof MARKERS[number];
export type FaceInfo = Readonly<{ name: string; color: string; fill: 'solid' | 'outline'; shape: FaceShape; marker: MarkerPosition }>;

export function faceInfo(id: number): FaceInfo {
  const shapeIndex = id % 8;
  const markerIndex = Math.floor(id / 8) % 8;
  const fill = id < 64 ? 'solid' : 'outline';
  const color = COLORS[markerIndex] ?? COLORS[0];
  const colorName = COLOR_NAMES[markerIndex] ?? COLOR_NAMES[0];
  const shape = SHAPES[shapeIndex] ?? SHAPES[0];
  const marker = MARKERS[markerIndex] ?? MARKERS[0];
  return { name: `${colorName} ${fill} ${shape}, marker ${marker}`, color, fill, shape, marker };
}

export function faceShapePoints(id: number): string {
  return POINTS[id % 8] ?? POINTS[0];
}

export function markerOffset(id: number): readonly [number, number] {
  return MARKER_OFFSETS[Math.floor(id / 8) % 8] ?? MARKER_OFFSETS[0];
}

