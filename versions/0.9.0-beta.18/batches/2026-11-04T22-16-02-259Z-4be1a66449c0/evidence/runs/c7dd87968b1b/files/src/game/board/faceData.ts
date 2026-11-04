export const PALETTE = ['#63E7FF', '#FF71D6', '#8BEA7D', '#FFE082', '#FFB064', '#B49AFF', '#FF8296', '#D9F3FF'] as const;
const COLOR_NAMES = ['cyan', 'magenta', 'green', 'yellow', 'orange', 'violet', 'rose', 'ice'] as const;
const SHAPE_NAMES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const MARKER_NAMES = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
const MARKERS = [
  [50, 10], [78.284, 21.716], [90, 50], [78.284, 78.284],
  [50, 90], [21.716, 78.284], [10, 50], [21.716, 21.716],
] as const;

export type FaceData = Readonly<{
  color: string;
  colorName: string;
  shape: number;
  shapeName: string;
  fill: 'solid' | 'outline';
  markerName: string;
  markerX: number;
  markerY: number;
  name: string;
}>;

export function getFaceData(id: number): FaceData {
  const shapeIndex = id % 8;
  const markerIndex = Math.floor(id / 8) % 8;
  const fill = Math.floor(id / 64) === 0 ? 'solid' : 'outline';
  const colorName = COLOR_NAMES[markerIndex] ?? 'cyan';
  const shapeName = SHAPE_NAMES[shapeIndex] ?? 'circle';
  const markerName = MARKER_NAMES[markerIndex] ?? 'top';
  const [markerX, markerY] = MARKERS[markerIndex] ?? [50, 10];
  const color = PALETTE[markerIndex] ?? PALETTE[0];
  const name = `${colorName} ${fill} ${shapeName}, marker ${markerName}`;
  return { color, colorName, shape: shapeIndex, shapeName, fill, markerName, markerX, markerY, name };
}
