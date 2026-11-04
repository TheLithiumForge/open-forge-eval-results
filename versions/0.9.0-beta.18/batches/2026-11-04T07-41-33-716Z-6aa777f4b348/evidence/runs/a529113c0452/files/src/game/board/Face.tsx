import { faceIdentity } from './faceIdentity.ts';
import { Shape } from './Shape.tsx';

export function Face({ id }: Readonly<{ id: number }>) {
  const face = faceIdentity(id);
  const outlined = face.fill === 'outline';
  return (
    <svg className="card-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g fill={outlined ? 'none' : face.color} stroke={outlined ? face.color : 'none'}
        strokeWidth={outlined ? 5 : 0} strokeLinejoin="round">
        <Shape shape={face.shape} />
      </g>
      <circle cx={face.marker.x} cy={face.marker.y} r="5" fill={face.color}
        stroke="#111625" strokeWidth="3" />
    </svg>
  );
}
