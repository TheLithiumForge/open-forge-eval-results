const COLORS = ["#63E7FF", "#FF71D6", "#8BEA7D", "#FFE082", "#FFB064", "#B49AFF", "#FF8296", "#D9F3FF"] as const;
const COLOR_NAMES = ["cyan", "magenta", "green", "yellow", "orange", "violet", "rose", "ice"] as const;
const SHAPES = ["circle", "square", "triangle", "diamond", "star", "hexagon", "plus", "chevron"] as const;
const MARKERS = ["top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left"] as const;
const MARKER_POINTS = [
  [50, 10], [78.284, 21.716], [90, 50], [78.284, 78.284],
  [50, 90], [21.716, 78.284], [10, 50], [21.716, 21.716],
] as const;
const FACE_BACKGROUND = "#111625";

function starPoints(): string {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 === 0 ? 25 : 11;
    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
  }).join(" ");
}

function shapeElement(shape: number, fill: string, color: string) {
  const props = { fill, stroke: color, strokeWidth: fill === "none" ? 5 : 0, strokeLinejoin: "round" as const };
  switch (shape) {
    case 0: return <circle cx="50" cy="50" r="25" {...props} />;
    case 1: return <rect x="25" y="25" width="50" height="50" {...props} />;
    case 2: return <polygon points="50,25 75,75 25,75" {...props} />;
    case 3: return <polygon points="50,25 75,50 50,75 25,50" {...props} />;
    case 4: return <polygon points={starPoints()} {...props} />;
    case 5: return <polygon points="37.5,25 62.5,25 75,50 62.5,75 37.5,75 25,50" {...props} />;
    case 6: return <path d="M42 25h16v17h17v16H58v17H42V58H25V42h17z" {...props} />;
    default: return <polygon points="25,25 50,42 75,25 75,43 50,61 75,77 58,77 50,68 42,77 25,77 42,60 25,43" {...props} />;
  }
}

export function faceName(faceId: number): string {
  const marker = Math.floor(faceId / 8) % 8;
  const fill = Math.floor(faceId / 64) === 0 ? "solid" : "outline";
  return `${COLOR_NAMES[marker]} ${fill} ${SHAPES[faceId % 8]}, marker ${MARKERS[marker]}`;
}

export function Face({ faceId }: { readonly faceId: number }) {
  const marker = Math.floor(faceId / 8) % 8;
  const outline = Math.floor(faceId / 64) === 1;
  const color = COLORS[marker]!;
  const point = MARKER_POINTS[marker]!;
  return (
    <svg className="face-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {shapeElement(faceId % 8, outline ? "none" : color, color)}
      <circle cx={point[0]} cy={point[1]} r="5" fill={color} stroke={FACE_BACKGROUND} strokeWidth="3" />
    </svg>
  );
}

export function ClosedFace() {
  return (
    <svg className="closed-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <polygon points="50,26 74,50 50,74 26,50" fill="#757C9A" />
    </svg>
  );
}
