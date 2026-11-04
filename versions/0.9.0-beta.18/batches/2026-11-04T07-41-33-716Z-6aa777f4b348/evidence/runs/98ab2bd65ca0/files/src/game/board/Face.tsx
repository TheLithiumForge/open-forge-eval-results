import type { FaceData } from "./face-data.ts";

const FACE_BACKGROUND = "#111625";

function Shape({ face }: { readonly face: FaceData }) {
  const fill = face.fill === "solid" ? face.color : "none";
  const stroke = face.fill === "outline" ? face.color : "none";
  const strokeWidth = face.fill === "outline" ? 5 : 0;
  const common = { fill, stroke, strokeWidth, strokeLinejoin: "round" as const };

  if (face.shape === "circle") return <circle cx="50" cy="50" r="25" {...common} />;
  if (face.shape === "square") return <rect x="25" y="25" width="50" height="50" {...common} />;
  if (face.shape === "triangle") return <polygon points="50,25 75,75 25,75" {...common} />;
  if (face.shape === "diamond") return <polygon points="50,25 75,50 50,75 25,50" {...common} />;
  if (face.shape === "star") {
    return <polygon points="50,25 56,42 75,42 60,53 66,72 50,61 34,72 40,53 25,42 44,42" {...common} />;
  }
  if (face.shape === "hexagon") {
    return <polygon points="50,25 72,37.5 72,62.5 50,75 28,62.5 28,37.5" {...common} />;
  }
  if (face.shape === "plus") {
    return <path d="M42 25h16v17h17v16H58v17H42V58H25V42h17z" {...common} />;
  }
  return <path d="M25 25h22l28 25-28 25H25l28-25z" {...common} />;
}

export function Face({ face }: { readonly face: FaceData }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100">
      <Shape face={face} />
      <circle
        cx={face.markerX}
        cy={face.markerY}
        r="5"
        fill={face.color}
        stroke={FACE_BACKGROUND}
        strokeWidth="3"
      />
    </svg>
  );
}
