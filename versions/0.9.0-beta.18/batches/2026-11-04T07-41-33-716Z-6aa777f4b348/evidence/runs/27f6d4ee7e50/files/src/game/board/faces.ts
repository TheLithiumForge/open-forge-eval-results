export const SHAPES = ["circle", "square", "triangle", "diamond", "star", "hexagon", "plus", "chevron"] as const;
export const MARKERS = ["top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left"] as const;
export const FILLS = ["solid", "outline"] as const;
export const COLORS = ["cyan", "magenta", "green", "yellow", "orange", "violet", "rose", "ice"] as const;
export const PALETTE = ["#63E7FF", "#FF71D6", "#8BEA7D", "#FFE082", "#FFB064", "#B49AFF", "#FF8296", "#D9F3FF"] as const;

export type Shape = (typeof SHAPES)[number];
export type Marker = (typeof MARKERS)[number];
export type Fill = (typeof FILLS)[number];

export interface FaceDescription {
  readonly shape: Shape;
  readonly marker: Marker;
  readonly fill: Fill;
  readonly colorName: string;
  readonly color: string;
  readonly name: string;
}

export function describeFace(id: number): FaceDescription | null {
  if (!Number.isInteger(id) || id < 0 || id >= 128) return null;
  const shape = SHAPES[id % 8];
  const markerIndex = Math.floor(id / 8) % 8;
  const marker = MARKERS[markerIndex];
  const fill = FILLS[Math.floor(id / 64)];
  const colorName = COLORS[markerIndex];
  const color = PALETTE[markerIndex];
  if (shape === undefined || marker === undefined || fill === undefined || colorName === undefined || color === undefined) return null;
  return { shape, marker, fill, colorName, color, name: `${colorName} ${fill} ${shape}, marker ${marker}` };
}

export function markerCenter(marker: Marker): readonly [number, number] {
  switch (marker) {
    case "top": return [50, 10];
    case "top-right": return [78.284, 21.716];
    case "right": return [90, 50];
    case "bottom-right": return [78.284, 78.284];
    case "bottom": return [50, 90];
    case "bottom-left": return [21.716, 78.284];
    case "left": return [10, 50];
    case "top-left": return [21.716, 21.716];
  }
}
