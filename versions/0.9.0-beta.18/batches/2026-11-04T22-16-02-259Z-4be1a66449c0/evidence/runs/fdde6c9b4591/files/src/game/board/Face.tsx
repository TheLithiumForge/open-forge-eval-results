import { faceDefinition, shapePoints } from "./faces.ts";

type FaceProps = Readonly<{ id: number }>;

export function Face({ id }: FaceProps) {
  const face = faceDefinition(id);
  const solid = face.fill === "solid";
  const shapeAttributes = {
    fill: solid ? face.color : "none",
    stroke: face.color,
    strokeWidth: solid ? undefined : 5,
  };
  const points = shapePoints(face.shape);

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {face.shape === "circle" && <circle cx="50" cy="50" r="25" {...shapeAttributes} />}
      {face.shape === "square" && <rect x="25" y="25" width="50" height="50" {...shapeAttributes} />}
      {face.shape === "plus" && <path d="M40 25h20v15h15v20H60v15H40V60H25V40h15z" {...shapeAttributes} />}
      {points && <polygon points={points} {...shapeAttributes} />}
      <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
    </svg>
  );
}
