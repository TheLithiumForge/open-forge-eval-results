import { faceData, starPoints } from './face.ts'

interface FaceProps { faceId: number }

export function Face({ faceId }: FaceProps) {
  const face = faceData(faceId)
  const line = face.outline ? face.color : undefined
  const fill = face.outline ? 'none' : face.color
  const style = { fill, stroke: line, strokeWidth: face.outline ? 5 : undefined, strokeLinejoin: 'round' as const }
  return (
    <svg aria-hidden="true" focusable="false" className="face-art" viewBox="0 0 100 100">
      {face.shape === 'circle' && <circle cx="50" cy="50" r="25" {...style} />}
      {face.shape === 'square' && <rect x="25" y="25" width="50" height="50" {...style} />}
      {face.shape === 'triangle' && <polygon points="50,25 75,75 25,75" {...style} />}
      {face.shape === 'diamond' && <polygon points="50,25 75,50 50,75 25,50" {...style} />}
      {face.shape === 'star' && <polygon points={starPoints()} {...style} />}
      {face.shape === 'hexagon' && <polygon points="37.5,25 62.5,25 75,50 62.5,75 37.5,75 25,50" {...style} />}
      {face.shape === 'plus' && <path d="M42 25h16v17h17v16H58v17H42V58H25V42h17z" {...style} />}
      {face.shape === 'chevron' && <polygon points="25,25 75,50 25,75 25,59 54,50 25,41" {...style} />}
      <circle cx={face.markerX} cy={face.markerY} r="5" fill={face.color} stroke="#111625" strokeWidth="3" />
    </svg>
  )
}
