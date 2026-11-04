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

export type ShapeName = (typeof SHAPES)[number];
export type MarkerName = (typeof MARKERS)[number];
export type FillName = "solid" | "outline";

export interface Face {
  readonly id: number;
  readonly color: string;
  readonly colorName: string;
  readonly fill: FillName;
  readonly shape: ShapeName;
  readonly marker: MarkerName;
  readonly name: string;
}

export function describeFace(id: number): Face | null {
  if (!Number.isInteger(id) || id < 0 || id > 127) return null;
  const markerIndex = Math.floor(id / 8) % 8;
  const color = PALETTE[markerIndex];
  const shape = SHAPES[id % 8];
  const marker = MARKERS[markerIndex];
  if (color === undefined || shape === undefined || marker === undefined) return null;
  const fill: FillName = id >= 64 ? "outline" : "solid";
  return {
    id,
    color: color.color,
    colorName: color.name,
    fill,
    shape,
    marker,
    name: `${color.name} ${fill} ${shape}, marker ${marker}`,
  };
}
