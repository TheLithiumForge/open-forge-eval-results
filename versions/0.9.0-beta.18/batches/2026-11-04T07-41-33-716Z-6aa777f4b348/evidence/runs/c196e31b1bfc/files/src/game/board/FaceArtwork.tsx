import { describeFace, MARKER_OFFSETS } from "./faceData.ts";

const FACE_BACKGROUND = "#111625";

export function FaceArtwork({ faceId }: { readonly faceId: number }) {
  const face = describeFace(faceId);
  const marker = MARKER_OFFSETS[face.markerIndex];
  if (marker === undefined) return null;
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100" className="face-art">
      <Shape shape={face.shape} fill={face.fill} color={face.color} />
      <circle cx={50 + marker.x} cy={50 + marker.y} r="5" fill={face.color} stroke={FACE_BACKGROUND} strokeWidth="3" />
    </svg>
  );
}

function Shape({ shape, fill, color }: { readonly shape: string; readonly fill: string; readonly color: string }) {
  const outline = fill === "outline";
  const paint = outline ? { fill: "none", stroke: color, strokeWidth: 5 } : { fill: color, stroke: "none", strokeWidth: 0 };
  switch (shape) {
    case "circle": return <circle cx="50" cy="50" r="25" {...paint} />;
    case "square": return <rect x="25" y="25" width="50" height="50" {...paint} />;
    case "triangle": return <polygon points="50,25 75,75 25,75" {...paint} />;
    case "diamond": return <polygon points="50,25 75,50 50,75 25,50" {...paint} />;
    case "star": return <polygon points="50,25 56,42 74,40 63,50 74,60 56,58 50,75 44,58 26,60 37,50 26,40 44,42" {...paint} />;
    case "hexagon": return <polygon points="38,25 62,25 75,50 62,75 38,75 25,50" {...paint} />;
    case "plus": return <polygon points="42,25 58,25 58,42 75,42 75,58 58,58 58,75 42,75 42,58 25,58 25,42 42,42" {...paint} />;
    case "chevron": return <polygon points="25,25 53,25 75,50 53,75 25,75 47,50" {...paint} />;
    default: return null;
  }
}

export function CardBack() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100" className="card-back-mark">
      <polygon points="50,34 66,50 50,66 34,50" fill="none" stroke="#757C9A" strokeWidth="4" />
    </svg>
  );
}
