const SHAPES = ["circle", "square", "triangle", "diamond", "star", "hexagon", "plus", "chevron"] as const;
const MARKERS = ["top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left"] as const;
const FILLS = ["solid", "outline"] as const;
const COLORS = [
  { name: "cyan", value: "#63E7FF" },
  { name: "magenta", value: "#FF71D6" },
  { name: "green", value: "#8BEA7D" },
  { name: "yellow", value: "#FFE082" },
  { name: "orange", value: "#FFB064" },
  { name: "violet", value: "#B49AFF" },
  { name: "rose", value: "#FF8296" },
  { name: "ice", value: "#D9F3FF" },
] as const;

export const MARKER_OFFSETS = [
  { x: 0, y: -40 },
  { x: 28.284271, y: -28.284271 },
  { x: 40, y: 0 },
  { x: 28.284271, y: 28.284271 },
  { x: 0, y: 40 },
  { x: -28.284271, y: 28.284271 },
  { x: -40, y: 0 },
  { x: -28.284271, y: -28.284271 },
] as const;

export interface FaceDescription {
  readonly name: string;
  readonly shape: (typeof SHAPES)[number];
  readonly fill: (typeof FILLS)[number];
  readonly color: string;
  readonly markerIndex: number;
  readonly marker: (typeof MARKERS)[number];
}

export function describeFace(faceId: number): FaceDescription {
  const shapeIndex = faceId % 8;
  const markerIndex = Math.floor(faceId / 8) % 8;
  const fill = FILLS[Math.floor(faceId / 64)];
  const shape = SHAPES[shapeIndex];
  const marker = MARKERS[markerIndex];
  const color = COLORS[markerIndex];
  if (shape === undefined || marker === undefined || color === undefined || fill === undefined) {
    throw new RangeError("Unknown card face.");
  }
  return {
    name: `${color.name} ${fill} ${shape}, marker ${marker}`,
    shape,
    fill,
    color: color.value,
    markerIndex,
    marker,
  };
}
