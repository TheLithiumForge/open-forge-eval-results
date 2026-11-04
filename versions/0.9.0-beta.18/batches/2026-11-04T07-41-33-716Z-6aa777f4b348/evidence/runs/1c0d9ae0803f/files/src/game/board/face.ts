export const FACE_TOTAL = 128;

export const SHAPE_NAMES = [
  "circle", "square", "triangle", "diamond", "star", "hexagon", "plus", "chevron",
] as const;
export const MARKER_NAMES = [
  "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left",
] as const;

const PALETTE = [
  { name: "cyan", color: "#63E7FF" }, { name: "magenta", color: "#FF71D6" },
  { name: "green", color: "#8BEA7D" }, { name: "yellow", color: "#FFE082" },
  { name: "orange", color: "#FFB064" }, { name: "violet", color: "#B49AFF" },
  { name: "rose", color: "#FF8296" }, { name: "ice", color: "#D9F3FF" },
] as const;

const DIAGONAL = 28.2842712475;
const MARKER_OFFSETS = [
  [0, -40], [DIAGONAL, -DIAGONAL], [40, 0], [DIAGONAL, DIAGONAL],
  [0, 40], [-DIAGONAL, DIAGONAL], [-40, 0], [-DIAGONAL, -DIAGONAL],
] as const;

export type FaceDescription = Readonly<{
  id: number;
  shape: (typeof SHAPE_NAMES)[number];
  marker: (typeof MARKER_NAMES)[number];
  markerX: number;
  markerY: number;
  fill: "solid" | "outline";
  colorName: (typeof PALETTE)[number]["name"];
  color: (typeof PALETTE)[number]["color"];
  name: string;
}>;

export function describeFace(id: number): FaceDescription {
  if (!Number.isSafeInteger(id) || id < 0 || id >= FACE_TOTAL) {
    throw new RangeError("Face identity must be an integer from 0 through 127");
  }
  const shapeIndex = id % SHAPE_NAMES.length;
  const markerIndex = Math.floor(id / SHAPE_NAMES.length) % MARKER_NAMES.length;
  const shape = SHAPE_NAMES[shapeIndex];
  const marker = MARKER_NAMES[markerIndex];
  const palette = PALETTE[markerIndex];
  const offset = MARKER_OFFSETS[markerIndex];
  if (!shape || !marker || !palette || !offset) {
    throw new RangeError("Face identity is outside the supported range");
  }
  const fill = Math.floor(id / 64) === 0 ? "solid" : "outline";
  return Object.freeze({
    id, shape, marker, markerX: 50 + offset[0], markerY: 50 + offset[1], fill,
    colorName: palette.name, color: palette.color,
    name: `${palette.name} ${fill} ${shape}, marker ${marker}`,
  });
}
