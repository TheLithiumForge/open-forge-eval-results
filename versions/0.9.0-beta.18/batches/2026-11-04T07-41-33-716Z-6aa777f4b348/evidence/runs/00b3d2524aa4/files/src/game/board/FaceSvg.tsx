import { describeFace, SHAPE_POINTS } from './face.ts'

type Props = Readonly<{ faceId: number }>

export default function FaceSvg({ faceId }: Props) {
  const face = describeFace(faceId)
  if (face === null) return null
  const points = SHAPE_POINTS[face.shapeIndex]
  if (points === undefined) return null
  const outline = face.fill === 'outline'
  const path = outline ? insetPoints(points) : points
  const fill = outline ? 'none' : face.color
  const common = { fill, stroke: outline ? face.color : 'none', strokeWidth: outline ? 5 : 0 }

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100">
      {face.shape === 'circle' ? <circle {...common} cx="50" cy="50" r={outline ? 22.5 : 25} /> : null}
      {face.shape === 'square' ? <rect {...common} x={outline ? 27.5 : 25} y={outline ? 27.5 : 25} width={outline ? 45 : 50} height={outline ? 45 : 50} /> : null}
      {face.shape !== 'circle' && face.shape !== 'square' ? <polygon {...common} points={path} strokeLinejoin="round" /> : null}
      <circle cx={face.markerX} cy={face.markerY} fill={face.color} r="5" stroke="#111625" strokeWidth="3" />
    </svg>
  )
}

function insetPoints(points: string): string {
  return points.split(' ').map((point) => point.split(',')
    .map((coordinate) => 50 + (Number(coordinate) - 50) * 0.9).join(',')).join(' ')
}
