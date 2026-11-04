import { describeFace } from './faces.ts';
import { FaceShape } from './FaceShape.tsx';

export interface FaceProps {
  face: number;
}

export function Face({ face }: FaceProps) {
  const identity = describeFace(face);
  const outlined = identity.fill === 'outline';
  return <svg className="card-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g fill={outlined ? 'none' : identity.color} stroke={outlined ? identity.color : 'none'}
      strokeWidth={outlined ? 5 : 0} strokeLinejoin="round">
      <FaceShape shape={identity.shape} />
    </g>
    <circle cx={identity.markerX} cy={identity.markerY} r="5" fill={identity.color}
      stroke="#111625" strokeWidth="3" />
  </svg>;
}
