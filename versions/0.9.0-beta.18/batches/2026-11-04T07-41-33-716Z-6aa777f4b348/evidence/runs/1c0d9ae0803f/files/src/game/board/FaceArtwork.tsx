import { describeFace, type FaceDescription } from "./face.ts";

type ShapeProps = Readonly<{
  shape: FaceDescription["shape"];
  fill: FaceDescription["fill"];
  color: FaceDescription["color"];
}>;

function ShapeArtwork({ shape, fill, color }: ShapeProps): React.JSX.Element {
  const paint = fill === "solid"
    ? { fill: color, stroke: "none", strokeWidth: 0 }
    : { fill: "none", stroke: color, strokeWidth: 5 };
  switch (shape) {
    case "circle": return <circle cx="50" cy="50" r="22" {...paint} />;
    case "square": return <rect x="28" y="28" width="44" height="44" {...paint} />;
    case "triangle": return <path d="M50 27 73 71H27Z" {...paint} />;
    case "diamond": return <path d="m50 27 23 23-23 23-23-23Z" {...paint} />;
    case "star": return <path d="m50 27 7 15 16 1-12 10 4 17-15-9-15 9 4-17-12-10 16-1Z" {...paint} />;
    case "hexagon": return <path d="M38 27h24l12 23-12 23H38L26 50Z" {...paint} />;
    case "plus": return <path d="M42 27h16v15h15v16H58v15H42V58H27V42h15Z" {...paint} />;
    case "chevron": return <path d="M31 27 72 50 31 73V59l17-9-17-9Z" {...paint} />;
  }
}

export function FaceArtwork({ faceId }: Readonly<{ faceId: number }>): React.JSX.Element {
  const face = describeFace(faceId);
  return (
    <svg className="neon-board-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <ShapeArtwork shape={face.shape} fill={face.fill} color={face.color} />
      <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color}
        stroke="#111625" strokeWidth="3" />
    </svg>
  );
}
