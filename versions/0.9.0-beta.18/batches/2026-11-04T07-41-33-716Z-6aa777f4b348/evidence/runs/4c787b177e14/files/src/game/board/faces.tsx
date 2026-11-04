const COLORS = ["#63E7FF", "#FF71D6", "#8BEA7D", "#FFE082", "#FFB064", "#B49AFF", "#FF8296", "#D9F3FF"] as const;
const COLOR_NAMES = ["cyan", "magenta", "green", "yellow", "orange", "violet", "rose", "ice"] as const;
const SHAPES = ["circle", "square", "triangle", "diamond", "star", "hexagon", "plus", "chevron"] as const;
const MARKER_NAMES = ["top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left"] as const;
const MARKERS = [
  { x: 50, y: 10 }, { x: 50 + 28.284, y: 50 - 28.284 }, { x: 90, y: 50 },
  { x: 50 + 28.284, y: 50 + 28.284 }, { x: 50, y: 90 },
  { x: 50 - 28.284, y: 50 + 28.284 }, { x: 10, y: 50 }, { x: 50 - 28.284, y: 50 - 28.284 },
] as const;

type FaceShape = (typeof SHAPES)[number];
type FaceParts = Readonly<{ color: string; colorName: string; shape: FaceShape; marker: number; fill: "solid" | "outline" }>;

function partsFor(faceId: number): FaceParts {
  const shapeIndex = faceId % 8;
  const marker = Math.floor(faceId / 8) % 8;
  const fill = faceId >= 64 ? "outline" : "solid";
  return {
    color: COLORS[marker] ?? COLORS[0],
    colorName: COLOR_NAMES[marker] ?? COLOR_NAMES[0],
    shape: SHAPES[shapeIndex] ?? SHAPES[0],
    marker,
    fill,
  };
}

export function faceName(faceId: number): string {
  const face = partsFor(faceId);
  return `${face.colorName} ${face.fill} ${face.shape}, marker ${MARKER_NAMES[face.marker] ?? MARKER_NAMES[0]}`;
}

function starPoints(): string {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = index * Math.PI / 5 - Math.PI / 2;
    const radius = index % 2 === 0 ? 25 : 11;
    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
  }).join(" ");
}

function shapeNode(shape: FaceShape, fill: string, stroke: string, outline: boolean): ReactNode {
  const attributes = { fill: outline ? "none" : fill, stroke: outline ? stroke : "none", strokeWidth: outline ? 5 : undefined };
  switch (shape) {
    case "circle": return <circle cx="50" cy="50" r="25" {...attributes} />;
    case "square": return <rect x="25" y="25" width="50" height="50" {...attributes} />;
    case "triangle": return <polygon points="50,25 75,75 25,75" {...attributes} />;
    case "diamond": return <polygon points="50,25 75,50 50,75 25,50" {...attributes} />;
    case "star": return <polygon points={starPoints()} {...attributes} />;
    case "hexagon": return <polygon points="37.5,25 62.5,25 75,50 62.5,75 37.5,75 25,50" {...attributes} />;
    case "plus": return <polygon points="38,25 62,25 62,38 75,38 75,62 62,62 62,75 38,75 38,62 25,62 25,38 38,38" {...attributes} />;
    case "chevron": return <polygon points="32,25 75,50 32,75 25,66 53,50 25,34" {...attributes} />;
  }
}

export function FaceArtwork({ faceId }: Readonly<{ faceId: number }>) {
  const face = partsFor(faceId);
  const marker = MARKERS[face.marker] ?? MARKERS[0];
  return (
    <svg className="face-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {shapeNode(face.shape, face.color, face.color, face.fill === "outline")}
      <circle cx={marker.x} cy={marker.y} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
    </svg>
  );
}

export function CardBack() {
  return (
    <svg className="card-back-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <polygon points="50,25 75,50 50,75 25,50" fill="none" stroke="#757C9A" strokeWidth="4" />
    </svg>
  );
}
import type { ReactNode } from "react";

