export const SHAPES = [
  "circle",
  "square",
  "triangle",
  "diamond",
  "star",
  "hexagon",
  "plus",
  "chevron",
] as const;

export const MARKERS = [
  "top",
  "top-right",
  "right",
  "bottom-right",
  "bottom",
  "bottom-left",
  "left",
  "top-left",
] as const;

export const PALETTE = [
  { name: "cyan", color: "#63E7FF" },
  { name: "magenta", color: "#FF71D6" },
  { name: "green", color: "#8BEA7D" },
  { name: "yellow", color: "#FFE082" },
  { name: "orange", color: "#FFB064" },
  { name: "violet", color: "#B49AFF" },
  { name: "rose", color: "#FF8296" },
  { name: "ice", color: "#D9F3FF" },
] as const;

export interface FaceData {
  readonly id: number;
  readonly shape: (typeof SHAPES)[number];
  readonly marker: (typeof MARKERS)[number];
  readonly fill: "solid" | "outline";
  readonly paletteName: (typeof PALETTE)[number]["name"];
  readonly color: string;
  readonly markerX: number;
  readonly markerY: number;
  readonly accessibleName: string;
}

const MARKER_POINTS: readonly (readonly [number, number])[] = [
  [50, 10],
  [78.284, 21.716],
  [90, 50],
  [78.284, 78.284],
  [50, 90],
  [21.716, 78.284],
  [10, 50],
  [21.716, 21.716],
];

export function getFaceData(id: number): FaceData | null {
  if (!Number.isSafeInteger(id) || id < 0 || id > 127) return null;
  const shape = SHAPES[id % SHAPES.length];
  const markerIndex = Math.floor(id / 8) % MARKERS.length;
  const marker = MARKERS[markerIndex];
  const palette = PALETTE[markerIndex];
  const point = MARKER_POINTS[markerIndex];
  if (shape === undefined || marker === undefined || palette === undefined || point === undefined) {
    return null;
  }
  const fill = id < 64 ? "solid" : "outline";
  return {
    id,
    shape,
    marker,
    fill,
    paletteName: palette.name,
    color: palette.color,
    markerX: point[0],
    markerY: point[1],
    accessibleName: `${palette.name} ${fill} ${shape}, marker ${marker}`,
  };
}
