import type { FaceDescription, ShapeName } from './faces.ts';
import { describeFace } from './faces.ts';

const STAR_POINTS = '50,25 56,42 74,42 60,53 65,72 50,61 35,72 40,53 26,42 44,42';

function Shape({ face }: Readonly<{ face: FaceDescription }>): React.JSX.Element {
  const common = face.outline
    ? { fill: 'none', stroke: face.color, strokeWidth: 5 }
    : { fill: face.color, stroke: 'none', strokeWidth: 0 };
  const shapes: Record<ShapeName, React.ReactNode> = {
    circle: <circle cx="50" cy="50" r="25" {...common} />,
    square: <rect x="25" y="25" width="50" height="50" {...common} />,
    triangle: <polygon points="50,25 75,73 25,73" {...common} />,
    diamond: <polygon points="50,25 75,50 50,75 25,50" {...common} />,
    star: <polygon points={STAR_POINTS} {...common} />,
    hexagon: <polygon points="50,25 71.65,37.5 71.65,62.5 50,75 28.35,62.5 28.35,37.5" {...common} />,
    plus: <path d="M42 25h16v17h17v16H58v17H42V58H25V42h17z" {...common} />,
    chevron: <polygon points="25,35 38,25 75,50 38,75 25,65 52,50" {...common} />,
  };
  return <>{shapes[face.shape]}</>;
}

export function Face({ id, matched = false }: Readonly<{ id: number; matched?: boolean }>): React.JSX.Element {
  const face = describeFace(id);
  return (
    <svg className="card-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <Shape face={face} />
      <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
      {matched && <path d="M83 65l3 3 7-8" fill="none" stroke="#8BEA7D" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
