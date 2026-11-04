import type { ReactElement } from "react";

const COLORS = ["#63E7FF", "#FF71D6", "#8BEA7D", "#FFE082", "#FFB064", "#B49AFF", "#FF8296", "#D9F3FF"] as const;
const COLOR_NAMES = ["cyan", "magenta", "green", "yellow", "orange", "violet", "rose", "ice"] as const;
const SHAPES = ["circle", "square", "triangle", "diamond", "star", "hexagon", "plus", "chevron"] as const;
const MARKERS = [
  { name: "top", x: 50, y: 10 },
  { name: "top-right", x: 78.284, y: 21.716 },
  { name: "right", x: 90, y: 50 },
  { name: "bottom-right", x: 78.284, y: 78.284 },
  { name: "bottom", x: 50, y: 90 },
  { name: "bottom-left", x: 21.716, y: 78.284 },
  { name: "left", x: 10, y: 50 },
  { name: "top-left", x: 21.716, y: 21.716 },
] as const;

const PATHS = [
  "M50 25 A25 25 0 1 1 49.99 25 Z",
  "M25 25 H75 V75 H25 Z",
  "M50 25 L75 75 H25 Z",
  "M50 25 L75 50 L50 75 L25 50 Z",
  "M50 25 L56 42 L75 42 L60 53 L66 75 L50 62 L34 75 L40 53 L25 42 L44 42 Z",
  "M37 25 H63 L75 50 L63 75 H37 L25 50 Z",
  "M42 25 H58 V42 H75 V58 H58 V75 H42 V58 H25 V42 H42 Z",
  "M25 25 L52 25 L75 50 L52 75 L25 75 L48 50 Z",
] as const;

export function faceName(id: number): string {
  const markerIndex = Math.floor(id / 8) % 8;
  const marker = MARKERS[markerIndex] ?? MARKERS[0];
  const shape = SHAPES[id % 8] ?? SHAPES[0];
  const fill = id >= 64 ? "outline" : "solid";
  return `${COLOR_NAMES[markerIndex] ?? "cyan"} ${fill} ${shape}, marker ${marker.name}`;
}

export function FaceArtwork({ id }: { id: number }): ReactElement {
  const markerIndex = Math.floor(id / 8) % 8;
  const marker = MARKERS[markerIndex] ?? MARKERS[0];
  const color = COLORS[markerIndex] ?? COLORS[0];
  const outline = id >= 64;
  const path = PATHS[id % 8] ?? PATHS[0];
  return (
    <svg aria-hidden="true" className="face-artwork" viewBox="0 0 100 100">
      <path d={path} fill={outline ? "none" : color} stroke={outline ? color : "none"} strokeWidth={outline ? 5 : 0} strokeLinejoin="round" />
      <circle cx={marker.x} cy={marker.y} r="5" fill={color} stroke="#111625" strokeWidth="3" />
    </svg>
  );
}

export function CardBack(): ReactElement {
  return (
    <svg aria-hidden="true" className="card-back" viewBox="0 0 100 100">
      <path d="M50 28 L72 50 L50 72 L28 50 Z" fill="none" stroke="#757C9A" strokeWidth="5" />
    </svg>
  );
}

