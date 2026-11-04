import type { ReactNode } from "react";
import { describeFace, markerCenter } from "./faces.ts";
import type { Shape } from "./faces.ts";

function shapeArtwork(shape: Shape, fill: string, outline: string): ReactNode {
  const strokeWidth = outline === "none" ? 0 : shape === "circle" || shape === "square" ? 5 : 50 / 9;
  switch (shape) {
    case "circle": return <circle cx="50" cy="50" r={outline === "none" ? 25 : 22.5} fill={fill} stroke={outline} strokeWidth={strokeWidth} />;
    case "square": return <rect x={outline === "none" ? 25 : 27.5} y={outline === "none" ? 25 : 27.5} width={outline === "none" ? 50 : 45} height={outline === "none" ? 50 : 45} fill={fill} stroke={outline} strokeWidth={strokeWidth} />;
    case "triangle": return <polygon transform={outline === "none" ? undefined : "translate(5 5) scale(0.9)"} points="50,25 75,75 25,75" fill={fill} stroke={outline} strokeWidth={strokeWidth} strokeLinejoin="round" />;
    case "diamond": return <polygon transform={outline === "none" ? undefined : "translate(5 5) scale(0.9)"} points="50,25 75,50 50,75 25,50" fill={fill} stroke={outline} strokeWidth={strokeWidth} strokeLinejoin="round" />;
    case "star": return <polygon transform={outline === "none" ? undefined : "translate(5 5) scale(0.9)"} points="50,25 56,42 75,42 60,54 66,73 50,61 34,73 40,54 25,42 44,42" fill={fill} stroke={outline} strokeWidth={strokeWidth} strokeLinejoin="round" />;
    case "hexagon": return <polygon transform={outline === "none" ? undefined : "translate(5 5) scale(0.9)"} points="38,25 62,25 75,50 62,75 38,75 25,50" fill={fill} stroke={outline} strokeWidth={strokeWidth} strokeLinejoin="round" />;
    case "plus": return <path transform={outline === "none" ? undefined : "translate(5 5) scale(0.9)"} d="M42 25h16v17h17v16H58v17H42V58H25V42h17z" fill={fill} stroke={outline} strokeWidth={strokeWidth} strokeLinejoin="round" />;
    case "chevron": return <path transform={outline === "none" ? undefined : "translate(5 5) scale(0.9)"} d="M25 28 50 50 75 28v18L50 68 25 46z" fill={fill} stroke={outline} strokeWidth={strokeWidth} strokeLinejoin="round" />;
  }
}

export function FaceArtwork({ faceId }: { readonly faceId: number }) {
  const face = describeFace(faceId);
  if (face === null) return null;
  const outline = face.fill === "outline" ? face.color : "none";
  const fill = face.fill === "solid" ? face.color : "none";
  const [cx, cy] = markerCenter(face.marker);
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100" className="face-artwork">
      {shapeArtwork(face.shape, fill, outline)}
      <circle cx={cx} cy={cy} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
    </svg>
  );
}
