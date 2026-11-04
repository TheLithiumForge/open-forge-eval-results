import { COLORS, SHAPES } from "./faces.ts";
const FACE_BACKGROUND = "#111625";

function polygon(points: readonly [number, number][]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function starPoints(): string {
  const points: [number, number][] = [];
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 === 0 ? 25 : 11;
    points.push([50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius]);
  }
  return polygon(points);
}

export function FaceArtwork({ faceId }: { faceId: number }) {
  const shape = SHAPES[faceId % 8]!;
  const marker = Math.floor(faceId / 8) % 8;
  const outline = faceId >= 64;
  const color = COLORS[marker]!;
  const diagonal = 28.284;
  const offsets: readonly [number, number][] = [
    [0, -40], [diagonal, -diagonal], [40, 0], [diagonal, diagonal],
    [0, 40], [-diagonal, diagonal], [-40, 0], [-diagonal, -diagonal],
  ];
  const [dx, dy] = offsets[marker]!;
  const markerX = Number((50 + dx).toFixed(3));
  const markerY = Number((50 + dy).toFixed(3));
  const shapeProps = { fill: outline ? "none" : color, stroke: outline ? color : "none", strokeWidth: 5, strokeLinejoin: "round" as const };
  return (
    <svg className="faceArtwork" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {shape === "circle" && <circle cx="50" cy="50" r="23" {...shapeProps} />}
      {shape === "square" && <rect x="27" y="27" width="46" height="46" {...shapeProps} />}
      {shape === "triangle" && <polygon points={polygon([[50, 26], [75, 72], [25, 72]])} {...shapeProps} />}
      {shape === "diamond" && <polygon points={polygon([[50, 25], [75, 50], [50, 75], [25, 50]])} {...shapeProps} />}
      {shape === "star" && <polygon points={starPoints()} {...shapeProps} />}
      {shape === "hexagon" && <polygon points={polygon([[37, 27], [63, 27], [75, 50], [63, 73], [37, 73], [25, 50]])} {...shapeProps} />}
      {shape === "plus" && <path d="M43 25h14v18h18v14H57v18H43V57H25V43h18z" {...shapeProps} />}
      {shape === "chevron" && <path d="M26 28h20l28 22-28 22H26l28-22z" {...shapeProps} />}
      <circle cx={markerX} cy={markerY} r="5" fill={color} stroke={FACE_BACKGROUND} strokeWidth="3" />
    </svg>
  );
}

export function CardBack() {
  return (
    <svg className="cardBackMark" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="M50 31 69 50 50 69 31 50z" fill="none" stroke="#B8BDD2" strokeWidth="5" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="4" fill="#B8BDD2" />
    </svg>
  );
}
