const COLORS = ["#63E7FF", "#FF71D6", "#8BEA7D", "#FFE082", "#FFB064", "#B49AFF", "#FF8296", "#D9F3FF"] as const;
const COLOR_NAMES = ["cyan", "magenta", "green", "yellow", "orange", "violet", "rose", "ice"] as const;
const SHAPES = ["circle", "square", "triangle", "diamond", "star", "hexagon", "plus", "chevron"] as const;
const MARKERS = ["top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left"] as const;
const MARKER_POINTS = [
  [50, 10], [78.284, 21.716], [90, 50], [78.284, 78.284],
  [50, 90], [21.716, 78.284], [10, 50], [21.716, 21.716],
] as const;

export type FaceDefinition = Readonly<{
  id: number;
  shape: (typeof SHAPES)[number];
  marker: (typeof MARKERS)[number];
  markerX: number;
  markerY: number;
  color: string;
  colorName: (typeof COLOR_NAMES)[number];
  fill: "solid" | "outline";
  name: string;
}>;

export function faceDefinition(id: number): FaceDefinition {
  const shape = SHAPES[id % 8]!;
  const markerIndex = Math.floor(id / 8) % 8;
  const marker = MARKERS[markerIndex]!;
  const color = COLORS[markerIndex]!;
  const colorName = COLOR_NAMES[markerIndex]!;
  const fill = id >= 64 ? "outline" : "solid";
  const [markerX, markerY] = MARKER_POINTS[markerIndex]!;
  return {
    id, shape, marker, markerX, markerY, color, colorName, fill,
    name: `${colorName} ${fill} ${shape}, marker ${marker}`,
  };
}

export function shapePoints(shape: FaceDefinition["shape"]): string | null {
  if (shape === "triangle") return "50,25 75,75 25,75";
  if (shape === "diamond") return "50,25 75,50 50,75 25,50";
  if (shape === "star") {
    return Array.from({ length: 10 }, (_, index) => {
      const angle = (Math.PI * (index * 36 - 90)) / 180;
      const radius = index % 2 === 0 ? 25 : 11.25;
      return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
    }).join(" ");
  }
  if (shape === "hexagon") {
    return Array.from({ length: 6 }, (_, index) => {
      const angle = (Math.PI * (index * 60 - 30)) / 180;
      return `${50 + Math.cos(angle) * 25},${50 + Math.sin(angle) * 25}`;
    }).join(" ");
  }
  if (shape === "chevron") return "25,25 75,50 25,75 25,60 55,50 25,40";
  return null;
}
