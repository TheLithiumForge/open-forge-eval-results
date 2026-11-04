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

export const SHAPES = [
  "circle", "square", "triangle", "diamond", "star", "hexagon", "plus", "chevron",
] as const;
export const MARKERS = [
  "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left",
] as const;
const OFFSETS = [
  [0, -40], [28.284, -28.284], [40, 0], [28.284, 28.284],
  [0, 40], [-28.284, 28.284], [-40, 0], [-28.284, -28.284],
] as const;

export type Face = {
  readonly shape: (typeof SHAPES)[number];
  readonly marker: (typeof MARKERS)[number];
  readonly fill: "solid" | "outline";
  readonly colorName: (typeof PALETTE)[number]["name"];
  readonly color: string;
  readonly markerX: number;
  readonly markerY: number;
};

export function getFace(id: number): Face {
  const markerIndex = Math.floor(id / 8) % 8;
  const palette = PALETTE[markerIndex];
  const offset = OFFSETS[markerIndex];
  const shape = SHAPES[id % 8];
  const marker = MARKERS[markerIndex];
  if (!palette || !offset || !shape || !marker) throw new RangeError("Invalid face ID.");
  return {
    shape,
    marker,
    fill: id < 64 ? "solid" : "outline",
    colorName: palette.name,
    color: palette.color,
    markerX: 50 + offset[0],
    markerY: 50 + offset[1],
  };
}

export function faceName(id: number): string {
  const face = getFace(id);
  return face.colorName + " " + face.fill + " " + face.shape + ", marker " + face.marker;
}
