import { describeFace } from './face.ts';
import { FaceShape } from './FaceShape.tsx';

export function Face({ id }: { readonly id: number }) {
  const face = describeFace(id);
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g fill={face.fill === 'solid' ? face.color : 'none'} stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth="5" strokeLinejoin="round">
      <FaceShape shape={face.shape} />
    </g>
    <circle cx={face.x} cy={face.y} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
