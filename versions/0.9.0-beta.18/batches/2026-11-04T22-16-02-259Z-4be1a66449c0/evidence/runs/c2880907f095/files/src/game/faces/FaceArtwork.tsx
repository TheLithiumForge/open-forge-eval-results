import { faceInfo, faceShapePoints, markerOffset } from '../faces';
import './FaceArtwork.css';

type Props = Readonly<{ faceId: number }>;

export function FaceArtwork({ faceId }: Props) {
  const face = faceInfo(faceId);
  const [markerX, markerY] = markerOffset(faceId);
  const cx = 50 + markerX;
  const cy = 50 + markerY;
  return (
    <svg className="face-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {face.shape === 'circle' ? (
        <circle cx="50" cy="50" r="25" fill={face.fill === 'solid' ? face.color : 'none'}
          stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth={face.fill === 'outline' ? 5 : 0} />
      ) : (
        <polygon points={faceShapePoints(faceId)} fill={face.fill === 'solid' ? face.color : 'none'}
          stroke={face.fill === 'outline' ? face.color : 'none'} strokeWidth={face.fill === 'outline' ? 5 : 0}
          strokeLinejoin="round" />
      )}
      <circle cx={cx} cy={cy} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
    </svg>
  );
}
