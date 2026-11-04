import type { CSSProperties } from "react";
import { describeFace } from "../faces.js";

const SHAPE_PATHS = [
  "M50 25a25 25 0 1 1 0 50a25 25 0 1 1 0-50",
  "M25 25H75V75H25Z",
  "M50 25L75 75H25Z",
  "M50 25L75 50L50 75L25 50Z",
  "M50 25L56 42H75L60 53L66 72L50 61L34 72L40 53L25 42H44Z",
  "M38 25H62L75 50L62 75H38L25 50Z",
  "M42 25H58V42H75V58H58V75H42V58H25V42H42Z",
  "M25 25H42L75 50L42 75H25L58 50Z",
] as const;

const MARKER_CENTERS = [
  [50, 10],
  [78.284, 21.716],
  [90, 50],
  [78.284, 78.284],
  [50, 90],
  [21.716, 78.284],
  [10, 50],
  [21.716, 21.716],
] as const;

interface FaceArtworkProps {
  readonly faceId: number;
}

export function FaceArtwork({ faceId }: FaceArtworkProps) {
  const face = describeFace(faceId);
  if (face === null) return null;
  const path = SHAPE_PATHS[faceId % 8];
  const marker = MARKER_CENTERS[Math.floor(faceId / 8) % 8];
  if (path === undefined || marker === undefined) return null;

  const shapeStyle: CSSProperties =
    face.fill === "solid"
      ? { fill: face.color, stroke: "none" }
      : { fill: "none", stroke: face.color, strokeWidth: 5, strokeLinejoin: "round" };

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d={path} style={shapeStyle} />
      <circle
        cx={marker[0]}
        cy={marker[1]}
        r="5"
        fill={face.color}
        stroke="#111625"
        strokeWidth="3"
      />
    </svg>
  );
}

export function CardBackArtwork() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="M50 24L76 50L50 76L24 50Z" fill="none" stroke="#757C9A" strokeWidth="5" />
    </svg>
  );
}
