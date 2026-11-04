import { getFaceData } from './faceData.ts';
import type { FaceData } from './faceData.ts';

type FaceProps = { faceId: number };

function Shape({ face, fill }: { face: FaceData; fill: string }) {
  const shared = { fill, stroke: face.color, strokeWidth: 5, strokeLinejoin: 'round' as const };
  switch (face.shape) {
    case 0: return <circle cx="50" cy="50" r="25" {...shared} />;
    case 1: return <rect x="25" y="25" width="50" height="50" {...shared} />;
    case 2: return <polygon points="50,25 75,75 25,75" {...shared} />;
    case 3: return <polygon points="50,25 75,50 50,75 25,50" {...shared} />;
    case 4: return <polygon points="50,25 56,42 75,42 60,54 66,75 50,63 34,75 40,54 25,42 44,42" {...shared} />;
    case 5: return <polygon points="37,25 63,25 75,50 63,75 37,75 25,50" {...shared} />;
    case 6: return <path d="M42 25h16v17h17v16H58v17H42V58H25V42h17z" {...shared} />;
    case 7: return <path d="M31 25h18l25 25-25 25H31l25-25z" {...shared} />;
  }
}

export function Face({ faceId }: FaceProps) {
  const face = getFaceData(faceId);
  const fill = face.fill === 'solid' ? face.color : 'none';
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className="face-svg">
      <Shape face={face} fill={fill} />
      <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
    </svg>
  );
}

export function BackFace() {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className="face-svg back-face">
      <polygon points="50,28 72,50 50,72 28,50" />
    </svg>
  );
}
