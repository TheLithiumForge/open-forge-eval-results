import { faceIdentity } from './faceIdentity.ts';

export interface FaceProps { readonly id: number }

export function Face({ id }: FaceProps) {
  const face = faceIdentity(id);
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d={face.path} fill={face.fill === 'solid' ? face.color : 'none'}
        stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth="5" strokeLinejoin="round" />
      <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color}
        stroke="#111625" strokeWidth="3" />
    </svg>
  );
}
