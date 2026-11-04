import { appearance } from './appearance.ts';
import { Shape } from './Shape.tsx';

interface FaceProps { readonly face: number }

export function Face({ face }: FaceProps) {
  const look = appearance(face);
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <Shape name={look.shape} color={look.color} outline={look.fill === 'outline'} />
    <circle cx={look.markerX} cy={look.markerY} r="5" fill={look.color} stroke="#111625" strokeWidth="3" />
  </svg>;
}
